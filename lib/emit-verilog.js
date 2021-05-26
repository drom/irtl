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
  vectorDim(node.width) + node.id;

const emitDefines = defo => {
  const signals = Object.keys(defo)
    .map(id => Object.assign({id}, defo[id]));

  return [
    '(',
    ...indent(signals
      .filter(e => e.dir !== undefined)
      .map(e => e.dir.padEnd(7) + emitType(e))
      .map(commap)),
    ');',
    ...signals
      .filter(e => (e.dir === undefined) && (e.clock === undefined))
      .map(e => 'wire   ' + emitType(e) + ';'),
    ...signals
      .filter(e => (e.dir === undefined) && (e.clock !== undefined))
      .map(e => 'reg    ' + emitType(e) + ';')
  ];
};


const emitExpression = (node, isRoot) => {

  if (typeof node === 'number') {
    node = {op: 'literal', node, width: Math.ceil(Math.log2(node))};
  }

  const items = node.items || [];

  if (!isRoot && node.__ID__) {
    return node.__ID__;
  }

  if (node.op in opo) {
    const pat = opo[node.op];
    return pat[0] +
      (items.map(e => emitExpression(e))).join(pat[1]) +
      pat[2];
  }

  switch (node.op) {
  case 'literal':
    return literal(node.value, node.width);
  case 'repeat':
    return '{' + items[1] +'{' + emitExpression(items[0]) + '}}';
  case 'bits':
    return emitExpression(items[0]) + bits(items[1], items[2]);
  default:
    return node;
  }
};


const emitStatement = defo => node => {
  const def = defo[node.__ID__];

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
      node.__ID__ + ' <= ' + emitExpression(node, true) + ';';
  }
  return 'assign ' + node.__ID__ + ' = ' + emitExpression(node, true) + ';';
};


const emitModule = node => {
  const defo = node.defo;
  return [
    'module ' + node.__ID__,
    ...emitDefines(defo),
    ...node.items.flatMap(emitStatement(defo)),
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
    return ['// circuit ' + node.__ID__, ...node.items.flatMap(emit)];
  case 'module':
    return emitModule(node);
  default:
    return node.__ID__;
  }
};

module.exports = emit;
