'use strict';

const IDENTITY = require('./identity.js');

const get = (target, prop) => {
  if (prop === IDENTITY) {
    return target;
  }
  if (!(prop in target.defo)) {
    target.defo[prop] = {type: 'Int', __ID__: prop, ref: target}; // empty object
  }
  return target.defo[prop];
};


const set = (target, prop, value) => {

  if (typeof value === 'number') {
    value = {op: 'literal', value, width: Math.ceil(Math.log2(value + 1))};
  } else
  if (typeof value !== 'object') {
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
