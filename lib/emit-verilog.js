'use strict';

// binary ops that map to a Verilog infix operator (variadic → left-associative fold)
const binInfix = {
  add: '+', sub: '-', mul: '*', div: '/', rem: '%',
  lt: '<', leq: '<=', gt: '>', geq: '>=', eq: '==', neq: '!=',
  and: '&', or: '|', xor: '^', xnor: '~^',
  land: '&&', lor: '||'
};

// unary ops that map to a Verilog prefix operator (incl. reduction operators)
const unary = {
  not: '~', neg: '-', lnot: '!',
  andr: '&', orr: '|', xorr: '^', nandr: '~&', norr: '~|', xnorr: '~^'
};

// signedness carrier (drives arithmetic vs logical right shift)
const signedOf = node =>
  (typeof node === 'object') && node !== null && node.signed === true;

// best-effort operand width, needed by head/tail/pad
const widthOf = node => {
  if (typeof node === 'number') {
    return Math.max(1, Math.ceil(Math.log2(node + 1)));
  }
  return (node && node.width !== undefined) ? node.width : undefined;
};

const indent = arr =>
  arr.map(e => '  ' + e);

const commap = (e, ei, arr) =>
  e + (((ei + 1) === arr.length) ? '' : ',');

const vectorDim = size => {
  const body = (Math.abs(size) > 1)
    ? '[' + (Math.abs(size) - 1) + ':0]'
    : '';
  return ((' ').repeat(20) + body + ' ').slice(-12);
};

const bits = (hi, lo) =>
  '[' + ((hi === lo) ? lo : (hi + ':' + lo)) + ']';

const literal = (val, w) =>
  (w === undefined) ? '' : w + '\'d' + (val || 0);

const emitType = node =>
  vectorDim(node.width) + node.__ID__;

const emitInstance = e => {
  const bindo = (e.bindo || {});
  const binds = Object
    .keys(bindo)
    .map(key => {
      const valo = bindo[key];
      return '.' + key + '(' + valo.__ID__ + ')';
    });

  const prefix = e.modo.__ID__ + ' u_' + e.modo.__ID__ + ' (';

  if (binds.length === 0) {
    return [prefix + ');'];
  }

  return [prefix, indent(binds).join(',\n'), ');'];
};

const emitExpression = (node, mod, isRoot) => {

  if (typeof node === 'number') {
    node = {op: 'literal', value: node, width: Math.max(1, Math.ceil(Math.log2(node + 1)))};
  }

  if (!isRoot && node.__ID__) {
    if (node.ref === undefined) {
      throw new Error('signal "' + node.__ID__ + '" is referenced but has no owning module (missing ref)');
    }
    if (mod === node.ref) {
      return node.__ID__;
    }
    return '_' + node.ref.pathString + '_' + node.__ID__;
  }

  const items = node.items || [];
  const E = i => emitExpression(items[i], mod);

  if (node.op in binInfix) {
    return '(' +
      items.map(e => emitExpression(e, mod)).join(' ' + binInfix[node.op] + ' ') +
      ')';
  }

  if (node.op in unary) {
    return unary[node.op] + '(' + E(0) + ')';
  }

  switch (node.op) {
  case 'buf':
    return E(0);
  case 'cat':
    return '{' + items.map(e => emitExpression(e, mod)).join(', ') + '}';
  case 'mux':
    return '(' + E(0) + ' ? ' + E(1) + ' : ' + E(2) + ')';
  case 'asUInt':
    return '$unsigned(' + E(0) + ')';
  case 'asSInt':
  case 'cvt':
    return '$signed(' + E(0) + ')';
  case 'shl':
    return '(' + E(0) + ' << ' + items[1] + ')';
  case 'shr':
    return signedOf(items[0])
      ? '($signed(' + E(0) + ') >>> ' + items[1] + ')'
      : '(' + E(0) + ' >> ' + items[1] + ')';
  case 'dshl':
    return '(' + E(0) + ' << ' + E(1) + ')';
  case 'dshr':
    return signedOf(items[0])
      ? '($signed(' + E(0) + ') >>> ' + E(1) + ')'
      : '(' + E(0) + ' >> ' + E(1) + ')';
  case 'pad': {
    const w = widthOf(items[0]);
    const n = items[1];
    if (w !== undefined && n > w) {
      return '{{' + (n - w) + '{1\'b0}}, ' + E(0) + '}';
    }
    return E(0);
  }
  case 'head': {
    const w = widthOf(items[0]);
    if (w === undefined) {
      throw new Error('head() needs a known operand width in the Verilog emitter');
    }
    return E(0) + bits(w - 1, w - items[1]);
  }
  case 'tail': {
    const w = widthOf(items[0]);
    if (w === undefined) {
      throw new Error('tail() needs a known operand width in the Verilog emitter');
    }
    return E(0) + bits(w - items[1] - 1, 0);
  }
  case 'literal':
    return literal(node.value, node.width);
  case 'repeat':
    return '{' + items[1] + '{' + E(0) + '}}';
  case 'bits':
    return E(0) + bits(items[1], items[2]);
  default:
    throw new Error('unhandled op in Verilog emitter: ' + node.op);
  }
};


const emitStatement = mod => node => {
  const def = mod.defo[node.__ID__];

  if (def === undefined) {
    throw new Error('undefined node: ' + node.__ID__);
  }

  if (node.clock) {
    return 'always @(posedge ' + node.clock.__ID__ +
      ((node.reset && !node.sync) ? ' or posedge ' + node.reset.__ID__ : '') +
      ') ' +
      (node.reset ?
        'if (' + node.reset.__ID__ + ') ' +
        node.__ID__ + ' <= ' + literal(node.resetValue, node.width) + '; ' +
        'else '
        : ''
      ) +
      node.__ID__ + ' <= ' + emitExpression(node, mod, true) + ';';
  }
  return 'assign ' + node.__ID__ + ' = ' + emitExpression(node, mod, true) + ';';
};

const emitModuleHeaderANSI = (node, signals) => {
  const prefix = 'module ' + node.__ID__ + ' (';
  const ports = signals
    .filter(e => e.dir !== undefined)
    .map(e => e.dir.padEnd(7) + emitType(e))
    .map(commap);

  if (ports.length === 0) {
    return [prefix + ');'];
  }
  return [prefix, ...indent(ports), ');'];
};

const emitModule = node => {
  const defo = node.defo;
  const defs = Object.keys(defo)
    .map(id => ({__ID__: id, ...defo[id]}));

  return [
    ...emitModuleHeaderANSI(node, defs),
    // '// wires',
    ...defs
      .filter(e => (e.dir === undefined) && (e.clock === undefined) && (e.kind !== 'instance'))
      .map(e => 'wire   ' + emitType(e) + ';'),
    // '// regs',
    ...defs
      .filter(e => (e.dir === undefined) && (e.clock !== undefined))
      .map(e => 'reg    ' + emitType(e) + ';'),
    // '// instances',
    ...defs
      .filter(e => (e.kind === 'instance'))
      .flatMap(emitInstance),
    // '// body',
    ...node.items.flatMap(emitStatement(node)),
    'endmodule',
    ''
  ];
};

const emit = node => {
  if (typeof node !== 'object') {
    throw new Error('unexpected node type: ' + (typeof node));
  }
  switch (node.kind) {
  case 'circuit':
    return ['// circuit ' + node.__ID__, ...node.items.flatMap(emit)].join('\n');
  case 'module':
    return emitModule(node);
  default:
    return node.__ID__;
  }
};

module.exports = emit;
