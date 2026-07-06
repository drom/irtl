'use strict';

// Convert a circuit (built via the Proxy or builder API) into a plain,
// cycle-free JSON object. The live IR is full of back-references (every signal
// points at its owning module, instances point at their module objects), so a
// naive JSON.stringify throws on the circular structure. This walks the IR and
// emits names in place of object references, producing something safe to
// stringify, diff, snapshot, or hand to an LLM.

const IDENTITY = require('./identity.js');

const unwrap = node => (node && node[IDENTITY]) || node;

const serializeExpr = node => {
  if (typeof node === 'number') {
    return node;
  }
  if (node === null || typeof node !== 'object') {
    return node;
  }
  if (node.op === 'literal') {
    return {literal: node.value, width: node.width};
  }
  if (node.op !== undefined) {
    return {op: node.op, args: (node.items || []).map(serializeExpr)};
  }
  if (node.__ID__ !== undefined) { // reference to a declared signal
    const ref = {sig: node.__ID__};
    if (node.ref !== undefined) {
      ref.mod = node.ref.__ID__;
    }
    return ref;
  }
  return node;
};

const defined = obj => {
  const res = {};
  Object.keys(obj).forEach(k => {
    if (obj[k] !== undefined) {
      res[k] = obj[k];
    }
  });
  return res;
};

const serializeSignal = (name, def) => {
  if (def.kind === 'instance') {
    const bindings = {};
    Object.keys(def.bindo || {}).forEach(port => {
      bindings[port] = def.bindo[port].__ID__;
    });
    return {name, kind: 'instance', of: def.modo.__ID__, bindings};
  }
  return defined({
    name,
    dir: def.dir,
    type: def.type,
    width: def.width,
    clock: def.clock && def.clock.__ID__,
    reset: def.reset && def.reset.__ID__,
    resetValue: def.resetValue,
    sync: def.sync
  });
};

const serializeModule = mod => {
  const m = unwrap(mod);
  return {
    name: m.__ID__,
    signals: Object.keys(m.defo).map(k => serializeSignal(k, m.defo[k])),
    body: m.items.map(item => ({
      target: item.__ID__,
      expr: serializeExpr(item)
    }))
  };
};

const serialize = circuit => ({
  kind: 'circuit',
  name: circuit.__ID__,
  modules: circuit.items.map(serializeModule)
});

module.exports = serialize;
