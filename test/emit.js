'use strict';

const chai = require('chai');

const lib = require('../lib/index.js');

const expect = chai.expect;

const testo = {
  t1: {
    ir: (
      {type: 'circuit', name: 'foo', items: [
        {type: 'module', name: 'bar', items: [
          {type: 'io', items: [
            {type: 'input', items: [{type: 'Int', id: 'inp1', width: 1}]},
            {type: 'comment', value: 'some comment'},
            {type: 'output', items: [{type: 'Int', id: 'out1', width: 11}]}
          ]},
          {type: 'wire', items: [{type: 'Int', id: 'tmp1'}]},
          {type: 'comment', value: 'some more comment'},
          {type: 'assign', lhs: 'out1', rhs: {type: 'and', items: ['inp1', 'tmp1', 'tmp2']}}
        ]}
      ]}
    ),
    fir: [
      'circuit foo :',
      '  module bar :',
      '    input  inp1: UInt<1>',
      '    ; some comment',
      '    output out1: UInt<11>',
      '    wire   tmp1: UInt',
      '    ; some more comment',
      '    out1 <= and(inp1, and(tmp1, tmp2))'
    ],
    verilog: [
      '// circuit foo',
      'module bar',
      '(',
      '  input              inp1,',
      '  // some comment',
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
