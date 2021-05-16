'use strict';

const createModule = require('./create-module.js');

const genVariadics = expo =>
  (`
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
  `)
    .trim()
    .split(/\s+/)
    .map(name => {
      expo[name] = function () {
        const items = [];
        for (const arg of arguments) {
          items.push(arg);
        }
        return {type: name, items};
      };
    });

genVariadics(exports);

exports.module = createModule;
