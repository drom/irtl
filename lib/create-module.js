'use strict';


const get = (obj, prop) => {
  if (!(prop in obj.defo)) {
    obj.defo[prop] = {type: 'Int'}; // empty object
  }
  return obj.defo[prop];
};


const set = (obj, prop, value) => {

  if (typeof value === 'number') {
    value = {op: 'literal', value, width: Math.ceil(Math.log2(value))};
  } else
  if (typeof value !== 'object') {
    throw new Error('Unexpected type: ' + (typeof value) + ' of RHS: ' + value);
  }

  value.__ID__ = prop;

  let def = obj.defo[prop];

  if (def === undefined) {
    obj.defo[prop] = def = {};
    // return true;
  }

  if (typeof def !== 'object') {
    throw new Error('unexpected type: ' + (typeof def) + ' of "defo" entry: ' + prop);
  }

  Object.assign(def, value);

  if (value.op !== undefined) {
    obj.items.push(def);
  }

  return true;
};


const createModule = id => {
  const fn = function () {
    return {
      kind: 'module', __ID__: id,
      defo: fn.defo,
      items: fn.items
    };
  };

  fn.__ID__ = id;
  fn.defo = {};
  fn.items = [];
  return new Proxy(fn, {get, set});
};

module.exports = createModule;
