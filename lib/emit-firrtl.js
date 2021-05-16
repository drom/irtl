'use strict';

const binary = {
  'and': ['(', ' & ', ')'],
  'cat': ['{', ', ', '}'],
  'or': ['(', ' | ', ')']
};

const unary = {
  'not': '~',
  'andr': '&'
};

const indent = arr => arr.map(e => '  ' + e);

const int = node =>
  ((node.type === undefined) || (node.type === 'Int'))
    ? ((node.signed ? 'S' : 'U') + 'Int')
    : node.type;

const intw = node => int(node) + (
  (node.width === undefined)
    ? ''
    : '<' + node.width + '>'
);

const emitType = node =>
  (node.flip ? 'flip ' : '') +
  node.id + ': ' +
  (((node.items || []).length === 0)
    ? intw(node)
    : '{' + node.items.map(emitType).join(', ') + '}'
  ) +
  (node.vec ? node.vec.map(e => '[' + e + ']').join('') : '');


const emitDefines = signalo => {
  const signals = Object.keys(signalo)
    .map(id => Object.assign({id}, signalo[id]));

  return [].concat(
    signals
      .filter(e => e.dir === 'input')
      .map(e => 'input  ' + emitType(e)),
    signals
      .filter(e => e.dir === 'output')
      .map(e => 'output ' + emitType(e)),
    signals
      .filter(e => (e.dir === undefined) && (e.clock === undefined))
      .map(e => 'wire   ' + emitType(e)),
    signals
      .filter(e => (e.dir === undefined) && (e.clock !== undefined))
      .map(e =>
        'reg    ' + emitType(e) + ', ' + e.clock +
        (e.reset
          ? ' with: (reset => (' + e.reset + ', ' + (e.resetValue || 0) + '))'
          : '')
      )
  );
};

const emit = node => {
  if (typeof node === 'string') {
    return node;
  }
  if (node === undefined) {
    return;
  }

  if (binary[node.type]) {
    if (node.items.length === 1) {
      return emit(node.items[0]);
    }
    return node.type + '(' +
      emit(node.items[0]) +
      ((node.items.length === 1)
        ? ''
        : ', ' + ((node.items.length > 2)
          ? emit({
            type: node.type,
            width: node.width,
            items: node.items.slice(1)
          })
          : emit(node.items[1])
        )
      ) + ')';
  }

  if (unary[node.type]) {
    return node.type + '(' + (node.items.map(e => emit(e))) + ')';
  }

  switch (node.type) {
  case 'comment':
    return '; ' + node.value;
  case 'circuit':
    return [node.type + ' ' + node.name + ' :']
      .concat(indent(node.items.flatMap(emit)));
  case 'module':
    return [node.type + ' ' + node.name + ' :']
      .concat(indent(
        emitDefines(node.defo)
          .concat(node.items.flatMap(emit))
      ));
  case 'assign':
    return node.dst + ' <= ' + emit(node.src);
  case 'id':
    return node.name;
  case 'repeat':
    return emit({
      type: 'cat',
      items: Array.from({length: node.items[1]}).map(() => node.items[0])
    });
  case 'bits':
    return 'bits(' + node.items.flatMap(emit).concat(node.hi, node.lo).join(', ') + ')';
  case 'io':
    return node.items.flatMap(emit);
  case 'inst':
    return 'inst   ' + node.name + ' of ' + node.modo.name;

  default:
    return emitType(node);
  }
};

module.exports = emit;
