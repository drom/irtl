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

  switch (node.type) {
  case 'comment':
    return '; ' + node.value;
  case 'circuit':
    return [node.type + ' ' + node.name + ' :']
      .concat(indent(node.items.flatMap(emit)));
  case 'module':
    return [node.type + ' ' + node.name + ' :']
      .concat(
        indent(Object.keys(node.inputo).map(key => emit({
          type: 'input', items: [{
            type: 'Int', id: key, width: node.inputo[key].width
          }]
        }))),
        indent(Object.keys(node.outputo).map(key => emit({
          type: 'output', items: [{
            type: 'Int', id: key, width: node.outputo[key].width
          }]
        }))),
        indent(Object.keys(node.signalo).map(key => emit({
          type: node.signalo[key].type, items: [{
            type: 'Int', id: key, width: node.signalo[key].width
          }]
        }))),
        indent(node.items.flatMap(emit))
      );
  case 'wire':
  case 'input':
  case 'output':
    return node.items.map(item =>
      node.type.padEnd(7) + emit(item));
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
