'use strict';

const wire = width => {
  const res = {};
  if (typeof width === 'number') {
    if (width !== (width >>> 0)) {
      throw new Error('unexpected width: ' + width + ' of input');
    }
    res.width = width;
  }
  return res;
};

exports.wire = wire;


const input = width => {
  const res = wire(width);
  res.dir = 'input';
  return res;
};

['Clock', 'AsyncReset'].map(type =>
  input[type] = width => {
    const res = input(width);
    res.type = type;
    return res;
  }
);

// bundle, array, signed, flip, ...

exports.input = input;


const output = width => {
  const res = wire(width);
  res.dir = 'output';
  return res;
};

exports.output = output;


const inst = mod => ({
  kind: 'inst',
  mod: mod
});

exports.inst = inst;





const genVariadics = expo => (`
  asUInt  asSInt
  cvt
  neg  not
  andr  orr  xorr

  bits tail head
  pad
  add  sub
  mul  div  rem
  lt  leq  gt  geq  eq  neq
  shl  shr
  dshl dshr
  and  or  xor
  cat
  mux validif
  assert assume cover

  repeat
  buf

`).trim().split(/\s+/)
  .map(op => {
    expo[op] = function () {
      return {op, items: [...arguments]};
    };
  });

genVariadics(exports);
