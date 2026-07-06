'use strict';

const {describe, it} = require('node:test');
const assert = require('node:assert');

const lib = require('../lib/index.js');

const {input, output, and} = lib.elements;

// Build the same module two ways — Proxy sugar and the builder facade — and
// assert the emitted RTL is byte-identical.
describe('builder parity with Proxy API', () => {
  const viaProxy = () => {
    const m = lib.createModule('alu');
    m.clk = input.Clock();
    m.a = input(8);
    m.b = input(8);
    m.sum = output(9);
    m.acc = {width: 9, clock: m.clk};
    m.sum = and(m.a, m.b);
    return lib.createCircuit('top', [m]);
  };

  const viaBuilder = () => {
    const m = lib.build(lib.createModule('alu'))
      .addInput('clk', {type: 'Clock'})
      .addInput('a', {width: 8})
      .addInput('b', {width: 8})
      .addOutput('sum', {width: 9})
      .addReg('acc', {width: 9, clock: 'clk'});
    m.assign('sum', and(m.signal('a'), m.signal('b')));
    return lib.createCircuit('top', m);
  };

  it('verilog matches', () => {
    assert.equal(lib.emitVerilog(viaBuilder()), lib.emitVerilog(viaProxy()));
  });
  it('firrtl matches', () => {
    assert.equal(lib.emitFirrtl(viaBuilder()), lib.emitFirrtl(viaProxy()));
  });
});

describe('builder introspection', () => {
  const m = lib.build(lib.createModule('m'))
    .addInput('a', {width: 4})
    .addOutput('y', {width: 4})
    .addWire('w', {width: 2})
    .addReg('r', {width: 4, clock: 'clk'});

  it('reports ports and kinds', () => {
    assert.equal(m.hasPort('a'), true);
    assert.equal(m.hasPort('w'), false);
    assert.equal(m.getPortWidth('a'), 4);
    assert.equal(m.getPortDirection('y'), 'output');
    assert.deepEqual(m.listInputs(), ['a']);
    assert.deepEqual(m.listOutputs(), ['y']);
    assert.equal(m.getSignalKind('r'), 'register');
    assert.equal(m.getSignalKind('w'), 'wire');
  });
});

describe('builder validation', () => {
  it('rejects duplicate ports', () => {
    const m = lib.build(lib.createModule('m')).addInput('a', {width: 1});
    assert.throws(() => m.addInput('a', {width: 2}), /already declared as input/);
  });
  it('rejects invalid identifiers', () => {
    const m = lib.build(lib.createModule('m'));
    assert.throws(() => m.addOutput('1bad'), /invalid output name/);
  });
  it('requires a clock for registers', () => {
    const m = lib.build(lib.createModule('m'));
    assert.throws(() => m.addReg('r', {width: 4}), /requires a clock/);
  });
});

describe('serialize', () => {
  const m = lib.createModule('bar');
  m.clk = input.Clock();
  m.a = input(8);
  m.y = output(8);
  m.y = and(m.a, 3);
  const circuit = lib.createCircuit('top', [m]);
  const json = lib.serialize(circuit);

  it('round-trips through JSON without throwing', () => {
    const text = JSON.stringify(json);
    assert.deepEqual(JSON.parse(text), json);
  });
  it('has the expected shape', () => {
    assert.equal(json.kind, 'circuit');
    assert.equal(json.name, 'top');
    assert.equal(json.modules.length, 1);
    const mod = json.modules[0];
    assert.equal(mod.name, 'bar');
    const clk = mod.signals.find(s => s.name === 'clk');
    assert.equal(clk.type, 'Clock');
    assert.equal(clk.dir, 'input');
    const y = mod.body.find(s => s.target === 'y');
    assert.equal(y.expr.op, 'and');
  });
});
