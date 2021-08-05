'use strict';

const getLongSigName = nodo => [nodo.ref.pathString, nodo.__ID__].join('_');

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

const plumb = mods => {
  mods.map(modo => {

    const modName = modo.__ID__;
    if (modName === undefined) { throw new Error(); }

    const finder = nodo => {

      const sigName = nodo.__ID__;
      if (sigName === undefined) { throw new Error(); }


      if (modo !== nodo.ref) {

        const drvNodoIdx = nodo.ref.idx;

        const {defs, uses, lca} = getDefUse(
          nodo.ref.path.concat(drvNodoIdx),
          modo.path.concat(modo.idx)
        );

        const globalSigName = getLongSigName(nodo);

        // console.log(modName, sigName, globalSigName, drvNodoIdx, defs, lca, uses);

        {
          const drvModo = mods[drvNodoIdx];

          if (drvModo.defo[globalSigName] === undefined) {
            drvModo.items.push({
              ref: drvModo,
              __ID__: globalSigName,
              op: 'buf',
              items: [drvModo.defo[sigName]]
            });
          }
        }

        { // LCA wire
          const defo = mods[lca].defo;

          defo[globalSigName] = defo[globalSigName] || {
            ref: mods[lca], __ID__: globalSigName, width: nodo.width
          };

          // console.log(modo.idx, drvNodoIdx);

          // const globalSig = defo[globalSigName] = defo[globalSigName]
          //   || {ref: modo, __ID__: globalSigName, width: nodo.width};

          // if (drvNodoIdx === modo.idx) {
          //   globalSig.op = 'buf';
          //   globalSig.items = [defo[sigName]];
          //   modo.items.push(globalSig);
          // }

          { // bind definition branch
            const def0 = defs[0];
            if (def0 !== undefined) {
              const inst = defo[mods[def0].__ID__];
              inst.bindo[globalSigName] = {__ID__: globalSigName};
            }
          }

          { // bind usage branch
            const use0 = uses[0];
            if (use0 !== undefined) {
              const inst = defo[mods[use0].__ID__];
              inst.bindo[globalSigName] = {__ID__: globalSigName};
            }
          }
        }

        defs.map((idx, i, arr) => { // def -> lca path
          const modo = mods[idx];
          const defo = modo.defo;

          // if (defo[globalSigName]) {
          //   return;
          // }

          const oldGlobalSig = defo[globalSigName];
          const globalSig = defo[globalSigName] = {
            ref: modo, dir: 'output', __ID__: globalSigName, width: nodo.width
          };

          const next = arr[i + 1];

          if (next !== undefined) {
            defo[mods[next].__ID__].bindo[globalSigName] = {__ID__: globalSigName};
          }
          if ((idx === drvNodoIdx) && (oldGlobalSig === undefined)) {
            globalSig.op = 'buf';
            globalSig.items = [defo[sigName]];
            modo.items.push(globalSig);
          }
        });

        uses.map((idx, i, arr) => { // lca -> use path
          const modo = mods[idx];
          const defo = modo.defo;
          defo[globalSigName] = {
            dir: 'input', __ID__: globalSigName, width: nodo.width
          };
          const next = arr[i + 1];
          if (next !== undefined) { // transit
            defo[mods[next].__ID__].bindo[globalSigName] = {__ID__: globalSigName};
          }
        });

      }
      (nodo.items || []).map(finder);
    };
    modo.items.map(finder);
  });
};

module.exports = plumb;
