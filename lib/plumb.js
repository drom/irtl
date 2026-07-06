'use strict';

const getLongSigName = nodo => '_' + [nodo.ref.pathString, nodo.__ID__].join('_');

const getDefUse = (fullDefs, fullUses) => {
  let lca = 0; // Lowest Common Ancestor path
  const defs = [...fullDefs];
  const uses = [...fullUses];
  const ilen = Math.min(defs.length, uses.length);
  for (let i = 0; i < ilen; i++) {
    if (defs[0] !== uses[0]) {
      break;
    }
    // drop common part
    lca = defs[0];
    defs.shift();
    uses.shift();
  }
  return {defs, uses, lca};
};

// Route a cross-module signal through the hierarchy.
//
// The signal keeps its ORIGINAL local name in the driver module. The rename to
// the hierarchical global name (`_<path>_<sig>`) happens at each boundary
// crossing, expressed purely as instance port bindings — no buffer statements
// are inserted. For every (driver, user) pair we connect:
//   driver -> ... -> lca      as output bindings  (value flows up)
//   lca    -> ... -> user     as input  bindings  (value flows down)
// The lca module holds a plain wire; transit modules on the way up are outputs,
// on the way down are inputs. `output` always wins when a module plays both
// roles across different users (it sits on the shared up-spine).
const plumb = mods => {
  mods.forEach(modo => {
    if (modo.__ID__ === undefined) {
      throw new Error('module without a name');
    }

    const finder = nodo => {
      if (nodo.ref !== undefined && modo !== nodo.ref) {
        const drvIdx = nodo.ref.idx;

        const {defs, uses, lca} = getDefUse(
          nodo.ref.path.concat(drvIdx),
          modo.path.concat(modo.idx)
        );

        const G = getLongSigName(nodo); // global name
        const L = nodo.__ID__;          // driver-local name
        const W = nodo.width;

        // Declare the global port on a module (idempotent). `output` is forced
        // (it wins over `wire`/`input`); `wire`/`input` only fill an empty slot.
        const ensurePort = (mIdx, dir) => {
          const defo = mods[mIdx].defo;
          const cur = defo[G];
          if (dir === 'output') {
            defo[G] = Object.assign({ref: mods[mIdx], __ID__: G, width: W}, cur, {dir: 'output'});
          } else if (cur === undefined) {
            defo[G] = {ref: mods[mIdx], __ID__: G, width: W, ...(dir ? {dir} : {})};
          }
        };

        const bind = (pIdx, cIdx, childPort, parentSig) => {
          mods[pIdx].defo[mods[cIdx].__ID__].bindo[childPort] = {__ID__: parentSig};
        };

        // def side: lca -> driver, value flows up (output bindings)
        let parent = lca;
        for (let i = 0; i < defs.length; i++) {
          const child = defs[i];
          const isDriver = child === drvIdx;
          bind(parent, child, isDriver ? L : G, G);
          if (isDriver) {
            const drvSig = mods[child].defo[L];
            if (drvSig && drvSig.dir === undefined) {
              drvSig.dir = 'output'; // driver exposes its local signal upward
            }
          } else {
            ensurePort(child, 'output');
          }
          ensurePort(parent, parent === lca ? undefined : 'output');
          parent = child;
        }

        // use side: lca -> user, value flows down (input bindings)
        parent = lca;
        for (let i = 0; i < uses.length; i++) {
          const child = uses[i];
          const parentSig = parent === drvIdx ? L : G;
          bind(parent, child, G, parentSig);
          ensurePort(child, 'input');
          if (parent === lca && parent !== drvIdx) {
            ensurePort(parent, undefined); // plain wire at the lca
          }
          parent = child;
        }
      }
      (nodo.items || []).forEach(finder);
    };

    modo.items.forEach(finder);
  });
};

module.exports = plumb;
