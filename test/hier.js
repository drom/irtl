'use strict';

const chai = require('chai');

const lib = require('../lib/index.js');

const expect = chai.expect;

const { buf, and } = lib.elements;

const testo = {
  t1: {
    ir: () => {
      return [lib.createModule('top_mod')];
    },
    fir: (`\
circuit top_mod :
  module top_mod :
`
    ),
    verilog: (`\
// circuit top_mod
module top_mod ();
endmodule
`
    )
  },
  t2: {
    ir: () => {
      const [tb, top] = ['tb', 'top_mod'].map(name => lib.createModule(name));
      tb.clk = {type: 'Clock'};
      top.clock = buf(tb.clk);
      return [tb, [top]];
    },
    verilog: (`\
// circuit top_mod
module tb ();
wire               clk;
top_mod u_top_mod (
  ._tb_clk(clk)
);
endmodule

module top_mod (
  input              _tb_clk
);
wire               clock;
assign clock = _tb_clk;
endmodule
`
    ),
    fir: (`\
circuit top_mod :
  module tb :
    wire   clk: Clock
    inst u_top_mod of top_mod
  module top_mod :
    input  _tb_clk: UInt
    wire   clock: UInt
    clock <= clk
`
    )
  },
  t4a: {
    ir: () => {
      const [tb, top, foo, bar] = 'tb top foo bar'.split(' ').map(name => lib.createModule(name));
      tb.clock = {type: 'Clock'};
      foo.clock = buf(tb.clock);
      bar.clock = buf(tb.clock);
      foo.a = and(foo.b, foo.c);

      return [tb, [top, [foo], [bar]]];
    },
    verilog: (`\
// circuit top_mod
module tb ();
wire               clock;
top u_top (
  ._tb_clock(clock)
);
endmodule

module top (
  input              _tb_clock
);
foo u_foo (
  ._tb_clock(_tb_clock)
);
bar u_bar (
  ._tb_clock(_tb_clock)
);
endmodule

module foo (
  input              _tb_clock
);
wire               clock;
wire               b;
wire               c;
wire               a;
assign clock = _tb_clock;
assign a = (b & c);
endmodule

module bar (
  input              _tb_clock
);
wire               clock;
assign clock = _tb_clock;
endmodule
`
    ),
    fir: (`\
circuit top_mod :
  module tb :
    wire   clock: Clock
    inst u_top of top
  module top :
    input  _tb_clock: UInt
    inst u_foo of foo
    inst u_bar of bar
  module foo :
    input  _tb_clock: UInt
    wire   clock: UInt
    wire   b: UInt
    wire   c: UInt
    wire   a: UInt
    clock <= clock
    a <= and(b, c)
  module bar :
    input  _tb_clock: UInt
    wire   clock: UInt
    clock <= clock
`
    )
  },
  egi: {
    ir: () => {
      const [r, a, b, c, d, e, f, g, h, i] = 'r a b c d e f g h i'.split(' ').map(name => lib.createModule(name));
      f.sig = 100;
      e.foo = buf(f.sig);
      g.bar = buf(f.sig);
      i.baz = buf(f.sig);
      return [r, [a, [b, [c], [d, [e]], [f, [h, [i]]]], [g]]];
    },
    verilog: (`\
// circuit top_mod
module r ();
a u_a ();
endmodule

module a ();
wire         [6:0] _r_a_b_f_sig;
b u_b (
  ._r_a_b_f_sig(_r_a_b_f_sig)
);
g u_g (
  ._r_a_b_f_sig(_r_a_b_f_sig)
);
endmodule

module b (
  output       [6:0] _r_a_b_f_sig
);
c u_c ();
d u_d (
  ._r_a_b_f_sig(_r_a_b_f_sig)
);
f u_f (
  .sig(_r_a_b_f_sig)
);
endmodule

module c ();
endmodule

module d (
  input        [6:0] _r_a_b_f_sig
);
e u_e (
  ._r_a_b_f_sig(_r_a_b_f_sig)
);
endmodule

module e (
  input        [6:0] _r_a_b_f_sig
);
wire               foo;
assign foo = _r_a_b_f_sig;
endmodule

module f (
  output       [6:0] sig
);
h u_h (
  ._r_a_b_f_sig(sig)
);
assign sig = 7'd100;
endmodule

module h (
  input        [6:0] _r_a_b_f_sig
);
i u_i (
  ._r_a_b_f_sig(_r_a_b_f_sig)
);
endmodule

module i (
  input        [6:0] _r_a_b_f_sig
);
wire               baz;
assign baz = _r_a_b_f_sig;
endmodule

module g (
  input        [6:0] _r_a_b_f_sig
);
wire               bar;
assign bar = _r_a_b_f_sig;
endmodule
`
    ),
    fir: (`\
circuit top_mod :
  module r :
    inst u_a of a
  module a :
    wire   _r_a_b_f_sig: UInt<7>
    inst u_b of b
    inst u_g of g
  module b :
    output _r_a_b_f_sig: UInt<7>
    inst u_c of c
    inst u_d of d
    inst u_f of f
  module c :
  module d :
    input  _r_a_b_f_sig: UInt<7>
    inst u_e of e
  module e :
    input  _r_a_b_f_sig: UInt<7>
    wire   foo: UInt
    foo <= sig
  module f :
    output sig: UInt<7>
    inst u_h of h
    sig <= UInt<7>(100)
  module h :
    input  _r_a_b_f_sig: UInt<7>
    inst u_i of i
  module i :
    input  _r_a_b_f_sig: UInt<7>
    wire   baz: UInt
    baz <= sig
  module g :
    input  _r_a_b_f_sig: UInt<7>
    wire   bar: UInt
    bar <= sig
`
    )
  },
  i: {
    ir: () => {
      const [r, a, b, c, d, e, f, g, h, i] = 'r a b c d e f g h i'.split(' ').map(name => lib.createModule(name));
      f.sig = 100;
      i.baz = buf(f.sig);
      return [r, [a, [b, [c], [d, [e]], [f, [h, [i]]]], [g]]];
    },
    verilog: (`\
// circuit top_mod
module r ();
a u_a ();
endmodule

module a ();
b u_b ();
g u_g ();
endmodule

module b ();
c u_c ();
d u_d ();
f u_f ();
endmodule

module c ();
endmodule

module d ();
e u_e ();
endmodule

module e ();
endmodule

module f ();
wire         [6:0] sig;
h u_h (
  ._r_a_b_f_sig(sig)
);
assign sig = 7'd100;
endmodule

module h (
  input        [6:0] _r_a_b_f_sig
);
i u_i (
  ._r_a_b_f_sig(_r_a_b_f_sig)
);
endmodule

module i (
  input        [6:0] _r_a_b_f_sig
);
wire               baz;
assign baz = _r_a_b_f_sig;
endmodule

module g ();
endmodule
`
    ),
    fir: (`\
circuit top_mod :
  module r :
    inst u_a of a
  module a :
    inst u_b of b
    inst u_g of g
  module b :
    inst u_c of c
    inst u_d of d
    inst u_f of f
  module c :
  module d :
    inst u_e of e
  module e :
  module f :
    wire   sig: UInt<7>
    inst u_h of h
    sig <= UInt<7>(100)
  module h :
    input  _r_a_b_f_sig: UInt<7>
    inst u_i of i
  module i :
    input  _r_a_b_f_sig: UInt<7>
    wire   baz: UInt
    baz <= sig
  module g :
`
    )
  },
  g: {
    ir: () => {
      const [r, a, b, c, d, e, f, g, h, i] = 'r a b c d e f g h i'.split(' ').map(name => lib.createModule(name));
      f.sig = 100;
      g.bar = buf(f.sig);
      return [r, [a, [b, [c], [d, [e]], [f, [h, [i]]]], [g]]];
    },
    verilog: (`\
// circuit top_mod
module r ();
a u_a ();
endmodule

module a ();
wire         [6:0] _r_a_b_f_sig;
b u_b (
  ._r_a_b_f_sig(_r_a_b_f_sig)
);
g u_g (
  ._r_a_b_f_sig(_r_a_b_f_sig)
);
endmodule

module b (
  output       [6:0] _r_a_b_f_sig
);
c u_c ();
d u_d ();
f u_f (
  .sig(_r_a_b_f_sig)
);
endmodule

module c ();
endmodule

module d ();
e u_e ();
endmodule

module e ();
endmodule

module f (
  output       [6:0] sig
);
h u_h ();
assign sig = 7'd100;
endmodule

module h ();
i u_i ();
endmodule

module i ();
endmodule

module g (
  input        [6:0] _r_a_b_f_sig
);
wire               bar;
assign bar = _r_a_b_f_sig;
endmodule
`
    ),
    fir: (`\
circuit top_mod :
  module r :
    inst u_a of a
  module a :
    wire   _r_a_b_f_sig: UInt<7>
    inst u_b of b
    inst u_g of g
  module b :
    output _r_a_b_f_sig: UInt<7>
    inst u_c of c
    inst u_d of d
    inst u_f of f
  module c :
  module d :
    inst u_e of e
  module e :
  module f :
    output sig: UInt<7>
    inst u_h of h
    sig <= UInt<7>(100)
  module h :
    inst u_i of i
  module i :
  module g :
    input  _r_a_b_f_sig: UInt<7>
    wire   bar: UInt
    bar <= sig
`
    )
  }
};

Object.keys(testo).map(tName => {
  describe(tName, () => {
    const test = testo[tName];
    const circt = lib.createCircuit('top_mod', test.ir());

    it('fir', done => {
      const fir = lib.emitFirrtl(circt).join('\n');
      try {
        expect(fir).to.eq(test.fir);
      } catch (err) {
        console.log(fir);
        throw err;
      }
      done();
    });
    it('verilog', done => {
      const verilog = lib.emitVerilog(circt).join('\n');
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
