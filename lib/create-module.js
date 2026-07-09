'use strict';

const IDENTITY = require('./identity.js');

// Property reads that must NOT auto-create a signal. These are probes issued by
// host runtimes (ObservableHQ inspector, Immutable.js `isImmutable`, promise
// resolution, iterators) rather than real signal accesses. Without this guard
// they leak phantom entries like `then` and `@@__IMMUTABLE_*__@@` into `defo`.
const NON_SIGNAL_PROPS = new Set([
  'then', 'catch', 'finally',           // thenable / promise probes
  'next', 'return', 'throw',            // iterator protocol
  'constructor', 'prototype',           // reflection
  'toJSON', 'toString', 'valueOf', 'inspect', 'type', 'length', 'nodeType'
]);

const get = (target, prop) => {
  if (prop === IDENTITY) {
    return target;
  }
  // symbols (Symbol.iterator, Symbol.toPrimitive, node inspect, ...),
  // real own properties (kind, __ID__, defo, ins, items, idx, ...),
  // Immutable.js markers (@@__IMMUTABLE_*__@@) and other host probes are
  // passed through verbatim and never register a signal.
  if (
    typeof prop === 'symbol' ||
    Object.prototype.hasOwnProperty.call(target, prop) ||
    prop.startsWith('@@') ||
    NON_SIGNAL_PROPS.has(prop)
  ) {
    return target[prop];
  }
  if (!(prop in target.defo)) {
    target.defo[prop] = {type: 'Int', __ID__: prop, ref: target}; // empty object
  }
  return target.defo[prop];
};


const set = (target, prop, value) => {

  if (typeof value === 'number') {
    value = {op: 'literal', value, width: Math.max(1, Math.ceil(Math.log2(value + 1)))};
  } else if (typeof value !== 'object') {
    throw new Error('Unexpected type: ' + (typeof value) + ' of RHS: ' + value);
  }

  value.__ID__ = prop;
  value.ref = target;

  let def = target.defo[prop];

  if (def === undefined) {
    target.defo[prop] = def = {ref: target};
    // return true;
  }

  if (typeof def !== 'object') {
    throw new Error('unexpected type: ' + (typeof def) + ' of "defo" entry: ' + prop);
  }

  Object.assign(def, value, {ref: target});

  if (value.op !== undefined) {
    target.items.push(def);
  }

  return true;
};


const createModule = id => new Proxy({
  kind: 'module',
  __ID__: id,
  defo: {},
  ins: [],
  items: []
}, {get, set});

module.exports = createModule;
