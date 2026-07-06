'use strict';

// Explicit, discoverable, validating builder facade layered on top of the
// Proxy-based module API. It does not replace the Proxy sugar — it delegates to
// it — so both styles interoperate and emit identical output.
//
//   const m = build(createModule('adder'))
//     .addInput('a', {width: 8})
//     .addInput('b', {width: 8})
//     .addOutput('sum', {width: 9})
//     .assign('sum', add(m.a, m.b));

const IDENTITY = require('./identity.js');
const {input, output, wire} = require('./elements.js');

const ID_RE = /^[A-Za-z_]\w*$/;

const checkName = (name, what) => {
  if (typeof name !== 'string' || !ID_RE.test(name)) {
    throw new Error(
      'invalid ' + what + ' name: ' + JSON.stringify(name) +
      ' — must match ' + ID_RE
    );
  }
};

// Resolve a clock/reset argument that may be given as a signal object or as the
// name of a signal already declared on this module.
const resolveSignal = (proxy, sig) =>
  (typeof sig === 'string') ? proxy[sig] : sig;

class Builder {
  constructor(proxy) {
    this.proxy = proxy;
    this.target = proxy[IDENTITY]; // unwrap to the raw module for introspection
    this.children = [];
  }

  get defo() {
    return this.target.defo;
  }

  // Signal reference for use in expressions, e.g. add(m.signal('a'), m.signal('b')).
  signal(name) {
    return this.proxy[name];
  }

  ensureNew(name, what) {
    checkName(name, what);
    const def = this.defo[name];
    if (def !== undefined && (def.dir !== undefined || def.kind === 'instance')) {
      throw new Error(
        'signal "' + name + '" is already declared as ' +
        (def.kind === 'instance' ? 'an instance' : def.dir) +
        ' on module "' + this.target.__ID__ + '"'
      );
    }
  }

  addInput(name, opts = {}) {
    this.ensureNew(name, 'input');
    if (opts.type === 'Clock') {
      this.proxy[name] = input.Clock(opts.width);
    } else if (opts.type === 'AsyncReset') {
      this.proxy[name] = input.AsyncReset(opts.width);
    } else {
      this.proxy[name] = input(opts.width);
    }
    return this;
  }

  addOutput(name, opts = {}) {
    this.ensureNew(name, 'output');
    this.proxy[name] = output(opts.width);
    return this;
  }

  addWire(name, opts = {}) {
    checkName(name, 'wire');
    this.proxy[name] = wire(opts.width);
    return this;
  }

  addReg(name, opts = {}) {
    checkName(name, 'register');
    if (opts.clock === undefined) {
      throw new Error('register "' + name + '" requires a clock');
    }
    const reg = {width: opts.width, clock: resolveSignal(this.proxy, opts.clock)};
    if (opts.reset !== undefined) {
      reg.reset = resolveSignal(this.proxy, opts.reset);
      if (opts.resetValue !== undefined) {
        reg.resetValue = opts.resetValue;
      }
    }
    if (opts.sync) {
      reg.sync = true;
    }
    this.proxy[name] = reg;
    return this;
  }

  assign(name, expr) {
    checkName(name, 'signal');
    this.proxy[name] = expr;
    return this;
  }

  instantiate(child) {
    this.children.push(child instanceof Builder ? child : build(child));
    return this;
  }

  // Nested-array hierarchy form consumed by createCircuit.
  tree() {
    return [this.proxy, ...this.children.map(c => c.tree())];
  }

  // ---- introspection ----------------------------------------------------

  hasPort(name) {
    const def = this.defo[name];
    return def !== undefined && def.dir !== undefined;
  }

  getPortWidth(name) {
    const def = this.defo[name];
    return def && def.width;
  }

  getPortDirection(name) {
    const def = this.defo[name];
    return def && def.dir;
  }

  getSignalKind(name) {
    const def = this.defo[name];
    if (def === undefined) {
      return undefined;
    }
    if (def.kind === 'instance') {
      return 'instance';
    }
    if (def.dir !== undefined) {
      return def.dir; // 'input' | 'output'
    }
    if (def.clock !== undefined) {
      return 'register';
    }
    if (def.op === 'literal') {
      return 'literal';
    }
    return 'wire';
  }

  listInputs() {
    return Object.keys(this.defo).filter(k => this.defo[k].dir === 'input');
  }

  listOutputs() {
    return Object.keys(this.defo).filter(k => this.defo[k].dir === 'output');
  }
}

const build = proxy =>
  (proxy instanceof Builder) ? proxy : new Builder(proxy);

build.Builder = Builder;

module.exports = build;
