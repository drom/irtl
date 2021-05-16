'use strict';

const chai = require('chai');

const lib = require('../lib/index.js');

const expect = chai.expect;

const $ = lib.elements;

const bar = $.module('bar');

Object.assign(bar, {
  defo: {
    inp1: {width: 1,  dir: 'input'},
    inp2: {width: 32, dir: 'input'},
    out1: {width: 11, dir: 'output'},
    tmp1: {width: 1},
    tmp2: {width: 8,  clock: 'clk'},
    tmp3: {width: 16, clock: 'clk', reset: 'rst', sync: true},
    tmp4: {width: 32, clock: 'clk', reset: 'arst', resetValue: 1}
  },
  items: [
    {type: 'comment', value: 'some more comment'},
    {type: 'assign', dst: 'out1', src: {type: 'and', items: ['inp1', 'tmp1', 'tmp2']}}
  ]
});

const testo = {
  t1: {
    ir: (
      {type: 'circuit', name: 'foo', items: [bar]}
    ),
    fir: [
      'circuit foo :',
      '  module bar :',
      '    input  inp1: UInt<1>',
      '    input  inp2: UInt<32>',
      '    output out1: UInt<11>',
      '    wire   tmp1: UInt<1>',
      '    reg    tmp2: UInt<8>, clk',
      '    reg    tmp3: UInt<16>, clk with: (reset => (rst, 0))',
      '    reg    tmp4: UInt<32>, clk with: (reset => (arst, 1))',
      '    ; some more comment',
      '    out1 <= and(inp1, and(tmp1, tmp2))'
    ],
    verilog: [
      '// circuit foo',
      'module bar',
      '(',
      '  input              inp1,',
      '  input       [31:0] inp2,',
      '  output      [10:0] out1',
      ');',
      'wire               tmp1;',
      'reg          [7:0] tmp2;',
      'reg         [15:0] tmp3;',
      'reg         [31:0] tmp4;',
      '// some more comment',
      'assign out1 = (inp1 & tmp1 & tmp2);',
      'endmodule',
      ''
    ]
  }
};

describe('emit', () => {
  Object.keys(testo).map(tName => {
    it(tName + ' firrtl', done => {
      const test = testo[tName];
      expect(lib.emitFirrtl(test.ir)).to.be.deep.eq(test.fir);
      done();
    });
    it(tName + ' verilog', done => {
      const test = testo[tName];
      expect(lib.emitVerilog(test.ir)).to.be.deep.eq(test.verilog);
      done();
    });
  });
});

/* eslint-env mocha */
