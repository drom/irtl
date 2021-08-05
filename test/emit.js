'use strict';

const chai = require('chai');

const lib = require('../lib/index.js');

const expect = chai.expect;

const {
  input, output, wire,
  and, xor, or,
  buf,
  repeat
} = lib.elements;

const testo = {
  t1: {
    ir: () => {
      const m = lib.createModule('bar');

      // m.inp0 = wire(); // {}
      m.clk  = input.Clock();        // {dir: 'input', type: 'Clock'}
      m.rst  = input(1);             // {dir: 'input', width: 1}
      m.arst = input.AsyncReset();   // {dir: 'input', type: 'AsyncReset'}

      m.inp1 = input(1); // {dir: 'input', width: 1}
      m.inp2 = input(32);
      m.out1 = output(11);

      m.tmp1 = wire(1);     // {width: 1}
      m.tmp2 = {width: 8,  clock: m.clk};
      m.tmp3 = {width: 16, clock: m.clk, reset: m.rst};
      m.tmp4 = {width: 32, clock: m.clk, reset: m.arst, resetValue: 1};

      m.lit1 = 5;
      // {type: 'comment', value: 'some more comment'},
      m.out1 = and(m.inp1, m.tmp1, m.tmp2, m.tmp2);
      m.tmp8 = xor(m.tmp3, or(m.tmp4, m.lit1, 15));
      m.tmp3 = buf(m.out1);
      m.out2 = repeat(m.tmp1, 5);

      return [m];
    },
    fir: (`\
circuit top_mod:
  module bar:
    input  clk: Clock
    input  rst: UInt<1>
    input  arst: AsyncReset
    input  inp1: UInt<1>
    input  inp2: UInt<32>
    output out1: UInt<11>
    wire   tmp1: UInt<1>
    wire   lit1: UInt<3>
    wire   tmp8: UInt
    wire   out2: UInt
    reg    tmp2: UInt<8>, clk
    reg    tmp3: UInt<16>, clk with: (reset => (rst, 0))
    reg    tmp4: UInt<32>, clk with: (reset => (arst, 1))
    lit1 <= UInt<3>(5)
    out1 <= and(inp1, and(tmp1, and(tmp2, tmp2)))
    tmp8 <= xor(tmp3, or(tmp4, or(lit1, UInt<4>(15))))
    tmp3 <= out1
    out2 <= cat(tmp1, cat(tmp1, cat(tmp1, cat(tmp1, tmp1))))
`
    ),
    verilog: (`\
// circuit top_mod
module bar (
  input              clk,
  input              rst,
  input              arst,
  input              inp1,
  input       [31:0] inp2,
  output      [10:0] out1
);
wire               tmp1;
wire         [2:0] lit1;
wire               tmp8;
wire               out2;
reg          [7:0] tmp2;
reg         [15:0] tmp3;
reg         [31:0] tmp4;
assign lit1 = 3'd5;
assign out1 = (inp1 & tmp1 & tmp2 & tmp2);
assign tmp8 = (tmp3 ^ (tmp4 | lit1 | 4'd0));
always @(posedge clk or posedge rst) if (rst) tmp3 <= 16'd0; else tmp3 <= out1;
assign out2 = {5{tmp1}};
endmodule
`
    )
  }
};

Object.keys(testo).map(tName => {
  const test = testo[tName];
  const circt = lib.createCircuit('top_mod', test.ir());
  describe(tName, () => {
    it('fir', done => {
      const fir = lib.emitFirrtl(circt);
      try {
        expect(fir).to.eq(test.fir);
      } catch (err) {
        console.log(fir);
        throw err;
      }
      done();
    });
    it('verilog', done => {
      const verilog = lib.emitVerilog(circt);
      try {
        expect(verilog).to.eq(test.verilog);
      } catch (err) {
        console.log(verilog);
        throw err;
      }
      done();
    });
  });
});

/* eslint-env mocha */
