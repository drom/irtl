'use strict';

const getLongSigName = nodo =>
  '_' + [nodo.ref.pathString, nodo.__ID__].join('_');

// binary primops; variadic use is folded right into nested binary calls
const foldBinary = {
  add: 1, sub: 1, mul: 1, div: 1, rem: 1,
  lt: 1, leq: 1, gt: 1, geq: 1, eq: 1, neq: 1,
  dshl: 1, dshr: 1,
  and: 1, or: 1, xor: 1, cat: 1
};

// unary primops (casts + reductions + neg/not/cvt)
const unary = {
  asUInt: 1, asSInt: 1, asClock: 1, asAsyncReset: 1, asReset: 1,
  cvt: 1, neg: 1, not: 1, andr: 1, orr: 1, xorr: 1
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
    return getLongSigName(node);
  }

  const items = node.items || [];
  const E = i => emitExpression(items[i], mod);

  if (node.op in foldBinary) {
    if (items.length === 1) {
      return E(0);
    }
    const rest = (items.length > 2)
      ? {op: node.op, width: node.width, items: items.slice(1)}
      : items[1];
    return node.op + '(' + emitExpression(items[0], mod) + ', ' + emitExpression(rest, mod) + ')';
  }

  if (node.op in unary) {
    return node.op + '(' + E(0) + ')';
  }

  switch (node.op) {
  case 'buf':
    return E(0);
  case 'mux':
    return 'mux(' + E(0) + ', ' + E(1) + ', ' + E(2) + ')';
  case 'shl':
  case 'shr':
  case 'head':
  case 'tail':
  case 'pad':
    return node.op + '(' + E(0) + ', ' + items[1] + ')';
  case 'bits':
    return 'bits(' + [E(0), items[1], items[2]].join(', ') + ')';
  // ops with no FIRRTL primop — lower to an equivalent primop tree
  case 'nandr':
    return emitExpression({op: 'not', items: [{op: 'andr', items}]}, mod);
  case 'norr':
  case 'lnot': // lnot(x) === (x == 0) === ~|x
    return emitExpression({op: 'not', items: [{op: 'orr', items}]}, mod);
  case 'xnorr':
    return emitExpression({op: 'not', items: [{op: 'xorr', items}]}, mod);
  case 'xnor':
    return emitExpression({op: 'not', items: [{op: 'xor', items}]}, mod);
  case 'land':
    return emitExpression({op: 'and', items: items.map(it => ({op: 'orr', items: [it]}))}, mod);
  case 'lor':
    return emitExpression({op: 'or', items: items.map(it => ({op: 'orr', items: [it]}))}, mod);
  case 'literal':
    return literal(node);
  case 'repeat':
    return emitExpression({
      op: 'cat',
      items: Array.from({length: node.items[1]}).map(() => node.items[0])
    }, mod);
  default:
    throw new Error('unhandled op in FIRRTL emitter: ' + node.op);
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
      ...indent(node.items.flatMap(emit))
    ].join('\n') + '\n';
  case 'module':
    return emitModule(node, idx);
  default:
    return node.__ID__;
  }
};

module.exports = emit;
