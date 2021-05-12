'use strict';

const chai = require('chai');

const lib = require('../lib/index.js');

const expect = chai.expect;

const $ = lib.elements;

const bar = $.module('bar');

Object.assign(bar, {
  inputo: {
    inp1: {width: 1},
    inp2: {width: 32}
  },
  outputo: {
    out1: {width: 11}
  },
  signalo: {
    tmp1: {type: 'wire', width: 1}
  },
  items: [
    {type: 'comment', value: 'some more comment'},
    {type: 'assign', lhs: 'out1', rhs: {type: 'and', items: ['inp1', 'tmp1', 'tmp2']}}
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
      '// some more comment',
      'assign out1 = (inp1 & tmp1 & tmp2)',
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
