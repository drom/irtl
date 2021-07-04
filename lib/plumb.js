'use strict';

const getLongSigName = nodo => ['', nodo.ref.pathString, nodo.__ID__].join('_');

const plumb = mods => {
  mods.map(modo => {
    // console.log('(' + modo.__ID__ + ')');
    const finder = nodo => {
      const sigName = nodo.__ID__;
      if (sigName !== undefined) {
        if (modo !== nodo.ref) {
          const drvNodoIdx = nodo.ref.idx;
          const fullDefs = nodo.ref.path.concat(drvNodoIdx);
          const fullUses = modo.path.concat(modo.idx);

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

          const globalSigName = getLongSigName(nodo);

          // console.log({drvNodoIdx, globalSigName, fullDefs, fullUses, lca, defs, uses});

          {
            const lcaDefo = mods[lca].defo;
            // LCA wire (if does not exist)
            const name = (drvNodoIdx === lca) ? sigName : globalSigName;
            lcaDefo[name] = (lcaDefo[name] || {
              __ID__: name, width: nodo.width
            });
            { // bind definition branch
              const def0 = defs[0];
              if (def0 !== undefined) {
                const bindName = (def0 === drvNodoIdx) ? sigName : globalSigName;
                const inst = lcaDefo[mods[def0].__ID__];
                inst.bindo[bindName] = name;
              }
            }
            { // bind usage branch
              const use0 = uses[0];
              if (use0 !== undefined) {
                const inst = lcaDefo[mods[use0].__ID__];
                inst.bindo[globalSigName] = name;
              }
            }
          }

          defs.map((idx, i, arr) => { // def -> lca path
            const defo = mods[idx].defo;
            const name = (idx === drvNodoIdx) ? sigName : globalSigName;
            mods[idx].defo[name] = {
              dir: 'output', __ID__: name, width: nodo.width
            };
            const next = arr[i + 1];
            const bindName = (next === drvNodoIdx) ? sigName : globalSigName;
            if (next !== undefined) {
              defo[mods[next].__ID__].bindo[bindName] = globalSigName;
            }
          });

          uses.map((idx, i, arr) => { // lca -> use path
            const defo = mods[idx].defo;
            defo[globalSigName] = {
              dir: 'input', __ID__: globalSigName, width: nodo.width
            };
            const next = arr[i + 1];
            if (next !== undefined) {
              defo[mods[next].__ID__].bindo[globalSigName] = globalSigName;
            }
          });
        }
      }
      (nodo.items || []).map(finder);
    };
    modo.items.map(finder);
  });
};

module.exports = plumb;
