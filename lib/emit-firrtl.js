'use strict';

const opo = {
  'and': 2,
  'or':  2,
  'xor': 2,
  'cat': 2,

  'not':  1,
  'neg':  1,
  'andr': 1,
  'orr':  1,
  'xorr': 1

  // 'buf':  false
};

const indent = arr => arr.map(e => '  ' + e);

const int = node =>
  ((node.type === undefined) || (node.type === 'Int'))
    ? ((node.signed ? 'S' : 'U') + 'Int')
    : node.type;

const intw = node =>
  int(node) +
  ((node.width === undefined) ? '' : '<' + node.width + '>');

const literal = node =>
  int(node) +
  ((node.width === undefined) ? '' : '<' + node.width + '>') +
  ((node.value === undefined) ? '' : '(' + node.value + ')');

const emitType = node => {
  return node.__ID__ + ': ' + intw(node);
};

// (node.flip ? 'flip ' : '') +
// node.id + ': ' +
// (((node.items || []).length === 0)
//   ? intw(node)
//   : '{' + node.items.map(emitType).join(', ') + '}'
// ) +
// (node.vec ? node.vec.map(e => '[' + e + ']').join('') : '');

const emitExpression = (node, isRoot) => {

  if (typeof node === 'number') {
    node = {op: 'literal', node, value: node, width: Math.ceil(Math.log2(node))};
  }

  if (!isRoot && node.__ID__) {
    return node.__ID__;
  }

  if (node.op in opo) {
    if (node.items.length === 1) { // unary
      return emitExpression(node.items[0]);
    }

    return node.op + '(' +
      emitExpression(node.items[0]) + ', ' +
      ((node.items.length > 2)
        ? emitExpression({
          op: node.op,
          width: node.width,
          items: node.items.slice(1)
        })
        : emitExpression(node.items[1])
      ) +
      ')';
  }

  switch (node.op) {
  case 'buf':
    return emitExpression(node.items[0]);
  case 'literal':
    return literal(node);
  case 'repeat':
    return emitExpression({
      op: 'cat',
      items: Array.from({length: node.items[1]}).map(() => node.items[0])
    });
  case 'bits':
    return 'bits(' + [emitExpression(node.items[0]), node.items[1], node.items[2]].join(', ') + ')';
  default:
    return node.__ID__;
  }
};

const emitModule = node => {
  const defo = node.defo;
  const defs = Object.keys(defo)
    .map(e => ({__ID__: e, ...defo[e]}));

  return ['module ' + node.__ID__ + ' :'].concat(indent([
    // '; io',
    ...defs
      .filter(e => e.dir === 'input' || e.dir === 'output')
      .map(e => e.dir.padEnd(7) + emitType(e)),
    // '; wires',
    ...defs
      .filter(e => !e.kind && !e.dir && !e.clock)
      .map(e => 'wire   ' + emitType(e)),
    // '; regs',
    ...defs
      .filter(e => !e.kind && !e.dir && e.clock)
      .map(e =>
        'reg    ' + emitType(e) + ', ' + e.clock.__ID__ +
        (e.reset
          ? ' with: (reset => (' + e.reset.__ID__ + ', ' + (e.resetValue || 0) + '))'
          : '')
      ),
    // '; instances',
    ...defs
      .filter(e => e.kind === 'instance')
      .map(e => 'inst u_' + e.modo.__ID__ + ' of ' + e.modo.__ID__),
    // '; body',
    ...node.items.map(item =>
      item.__ID__ + ' <= ' + emitExpression(item, true)
    )
  ]));
};


const emit = node => {
  if (typeof node !== 'object') {
    throw new Error('unexpected node type: ' + (typeof node));
  }

  switch (node.kind) {
  // case 'comment':
  //   return '; ' + node.value;
  case 'circuit':
    return ['circuit ' + node.__ID__ + ' :',
      ...indent(node.items.flatMap(emit)),
      ''
    ];
  case 'module':
    return emitModule(node);
  default:
    return node.__ID__;
  }
};

module.exports = emit;
