'use strict';

const getLongSigName = nodo =>
  [nodo.ref.pathString, nodo.__ID__].join('_');

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

const emitExpression = (node, mod, isRoot) => {

  if (typeof node === 'number') {
    node = {op: 'literal', node, value: node, width: Math.ceil(Math.log2(node))};
  }

  if (!isRoot && node.__ID__) {
    if (node.ref === undefined) {
      console.log(node);
      throw new Error(node);
    }
    if (mod === node.ref) {
      return node.__ID__;
    }
    return getLongSigName(node);
  }

  if (node.op in opo) {
    if (node.items.length === 1) { // unary
      if (opo[node.op] === 1) {
        return node.op + '(' +
          emitExpression(node.items[0], mod) +
        ')';
      }
      return emitExpression(node.items[0], mod);
    }

    return node.op + '(' +
      emitExpression(node.items[0], mod) + ', ' +
      ((node.items.length > 2)
        ? emitExpression({
          op: node.op,
          width: node.width,
          items: node.items.slice(1)
        }, mod)
        : emitExpression(node.items[1], mod)
      ) +
      ')';
  }

  switch (node.op) {
  case 'buf':
    return emitExpression(node.items[0], mod);
  case 'literal':
    return literal(node);
  case 'repeat':
    return emitExpression({
      op: 'cat',
      items: Array.from({length: node.items[1]}).map(() => node.items[0])
    }, mod);
  case 'bits':
    return 'bits(' + [emitExpression(node.items[0], mod), node.items[1], node.items[2]].join(', ') + ')';
  default:
    return node.__ID__;
  }
};

const emitModule = (node /* , idx */) => {
  const defo = node.defo;
  const defs = Object.keys(defo)
    .map(e => ({__ID__: e, ...defo[e]}));

  const res = ['module ' + node.__ID__ + ':'];

  // if (defs.length === 0 || idx === 0) {
  //   return res.concat(indent(['skip']));
  // }

  return res.concat(indent([
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
      .flatMap(inst => {
        const instName = 'u_' + inst.modo.__ID__;
        return [
          'inst ' + instName + ' of ' + inst.modo.__ID__,
          ...Object
            .keys(inst.bindo)
            .map(key => {
              const valo = inst.bindo[key];
              if (inst.modo.defo[key].dir === 'input') {
                return instName + '.' + key + ' <= ' + valo.__ID__;
              } else {
                return valo.__ID__ + ' <= ' + instName + '.' + key;
              }
            })
        ];
      }),
    // ...Object.keys(e.bindo).flatMap(e => [';']),
    // '; body',
    ...node.items.map(item =>
      item.__ID__ + ' <= ' + emitExpression(item, node, true)
    )
  ]));
};


const emit = (node, idx) => {
  if (typeof node !== 'object') {
    throw new Error('unexpected node type: ' + (typeof node));
  }

  switch (node.kind) {
  // case 'comment':
  //   return '; ' + node.value;
  case 'circuit':
    return ['circuit ' + node.__ID__ + ':',
      ...indent(node.items.flatMap(emit)),
      '\n'
    ].join('\n');
  case 'module':
    return emitModule(node, idx);
  default:
    return node.__ID__;
  }
};

module.exports = emit;
