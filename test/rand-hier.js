'use strict';

const rnd = require('random-js');
// const chai = require('chai');

const lib = require('../lib/index.js');

// const expect = chai.expect;

const { and } = lib.elements;

const getName = n => {
  let res = '';
  for (let i = 0; i < 16; i++) {
    res += String.fromCharCode((n & 15) + 97);
    if (n === 0) {
      break;
    }
    n = n >>> 4;
  }
  return res;
};

const makeSomeOps = (mods, numOps, mt) => {
  for(let i = 0; i < numOps; i++) {
    const srcMod = mods[rnd.integer(0, mods.length - 1)(mt)];
    const dstMod = mods[rnd.integer(0, mods.length - 1)(mt)];
    const srcName = getName(rnd.integer(0, 0xffff)(mt));
    const dstName = getName(rnd.integer(0, 0xffff)(mt));
    dstMod[dstName] = and(srcMod[srcName]);
  }
};

const pRandSeq = (length, mt) => Array
  .from({length})
  .map((e, i) => rnd.integer(0, i)(mt));

const treeMix = (nums, mods) => {
  const root = [mods[0]];
  const nodes = [root];
  const ilen = nums.length - 1;
  for (let i = 0; i < ilen; i++) {
    const leaf = [mods[i + 1]];
    nodes[nums[i]].push(leaf);
    nodes.push(leaf);
  }
  return root;
};

const testo = {
  t3: {spec: {seed: 1, numMods: 3, numOps: 5}},
  t5: {spec: {seed: 7, numMods: 5, numOps: 7}},
  t7: {spec: {seed: 8, numMods: 7, numOps: 9}}
};


describe('rand hier', () => {
  Object.keys(testo).map(tName => {
    it(tName, done => {
      const test = testo[tName];
      const mt = rnd.MersenneTwister19937.seed(test.spec.seed);
      const nums = pRandSeq(test.spec.numMods, mt);
      const mods = nums.map(() => lib.createModule(getName(rnd.integer(0, 0xffff)(mt))));
      makeSomeOps(mods, test.spec.numOps, mt);
      const mix = treeMix(nums, mods);
      const circt = lib.createCircuit('top_mod', mix);
      const verilog = lib.emitVerilog(circt);
      console.log(verilog);
      done();
    });
  });
});

/* eslint-env mocha */
