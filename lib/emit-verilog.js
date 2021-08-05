'use strict';

const opo = {
  'and':  ['(',  ' & ', ')'],
  'or':   ['(',  ' | ', ')'],
  'xor':  ['(',  ' ^ ', ')'],
  'cat':  ['{',  ', ',  '}'],

  'not':  ['~(', ' ? ', ')'],
  'neg':  ['-(', ' ? ', ')'],
  'andr': ['&(', ' ? ', ')'],
  'orr':  ['|(', ' ? ', ')'],
  'xorr': ['^(', ' ? ', ')'],
  'buf':  ['',   ' ? ', '']
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
    node = {op: 'literal', node, width: Math.ceil(Math.log2(node))};
  }

  const items = node.items || [];

  if (!isRoot && node.__ID__) {
    if (node.ref === undefined) {
      console.log(node);
      throw new Error(node);
    }
    if (mod === node.ref) {
      return node.__ID__;
    }
    return '_' + node.ref.pathString + '_' + node.__ID__;
  }

  if (node.op in opo) {
    const pat = opo[node.op];
    return pat[0] +
      (items.map(e => emitExpression(e, mod))).join(pat[1]) +
      pat[2];
  }

  switch (node.op) {
  case 'literal':
    return literal(node.value, node.width);
  case 'repeat':
    return '{' + items[1] +'{' + emitExpression(items[0], mod) + '}}';
  case 'bits':
    return emitExpression(items[0], mod) + bits(items[1], items[2]);
  default:
    return node;
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
