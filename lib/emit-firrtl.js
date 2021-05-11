'use strict';

const indent = arr => arr.map(e => '  ' + e);

const int = node =>
  ((node.type === 'Int') ? (node.signed ? 'S' : 'U') : '') +
  node.type;

const intw = node =>
  int(node) + ((node.width === undefined) ? '' : '<' + node.width + '>');

const emitType = node =>
  (node.flip ? 'flip ' : '') +
  node.id + ': ' +
  (((node.items || []).length === 0)
    ? intw(node)
    : '{' + node.items.map(emitType).join(', ') + '}'
  ) +
  (node.vec ? node.vec.map(e => '[' + e + ']').join('') : '');

const ops = {
  'and': true,
  'or': true
};


const emit = node => {
  if (typeof node === 'string') {
    return node;
  }

  if (ops[node.type]) {
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

  switch (node.type) {
  case 'comment':
    return '; ' + node.value;
  case 'circuit':
  case 'module':
    return [node.type + ' ' + node.name + ' :']
      .concat(indent(node.items.flatMap(emit)));
  case 'wire':
  case 'input':
  case 'output':
    return node.type.padEnd(7) + emit(node.items[0]);
  case 'assign':
    return node.lhs + ' <= ' + emit(node.rhs);
  case 'id':
    return node.name;
  case 'io':
    return node.items.flatMap(emit);
  case 'inst':
    return 'inst   ' + node.name + ' of ' + node.modo.name;

  default:
    return emitType(node);
  }
};

module.exports = emit;
