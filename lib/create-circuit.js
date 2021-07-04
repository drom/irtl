'use strict';

const IDENTITY = require('./identity.js');
const plumb = require('./plumb.js');

const longName = (nodo, items) => nodo.path
  .map(idx => items[idx].__ID__)
  .concat([nodo.__ID__])
  .join('_');

const createCircuit = (name, tree) => {
  const mods = [];
  let idx = 0;
  let height = 0;
  const rec = (tree, path) => {
    const mod = tree[0];
    if (typeof mod !== 'object') {
      throw new Error('first element on the hierarchy array has to be module');
    }
    const modo = mod[IDENTITY];
    mods.push(modo);
    modo.idx = idx++;
    modo.height = height++;
    modo.path = path;
    modo.pathString = longName(modo, mods);
    for (let i = 1; i < tree.length; i++) {
      const m = rec(tree[i], path.concat(modo.idx));
      mod[m.__ID__] = {
        kind: 'instance',
        ref: modo,
        modo: m,
        bindo: {}
      };
    }
    height--;
    return modo;
  };
  rec(tree, []);
  plumb(mods);
  return {kind: 'circuit', __ID__: name, items: mods};
};

module.exports = createCircuit;
