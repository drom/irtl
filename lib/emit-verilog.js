'use strict';

const indent = arr => arr.map(e => '  ' + e);

const vectorDim = size => {
  const body = (Math.abs(size) > 1) ?
    '[' + (Math.abs(size) - 1) + ':0]' :
    '';
  return ((' ').repeat(20) + body + ' ').slice(-12);
};

const emitType = node =>
  vectorDim(node.width) + node.id;

const ops = {
  'and': '&',
  'or': '|'
};

const emit = node => {
  if (typeof node === 'string') {
    return node;
  }

  if (ops[node.type]) {
    return '(' +
      (node.items.map(e => emit(e))).join(' ' + ops[node.type] + ' ') +
      ')';
  }

  switch (node.type) {
  case 'comment':
    return ['// ' + node.value];
  case 'circuit':
    return ['// ' + node.type + ' ' + node.name]
      .concat(node.items.flatMap(emit));
  case 'module':
    return [node.type + ' ' + node.name]
      .concat(
        '(',
        indent(
          (Object.keys(node.inputo).map(key => emit({
            type: 'input', items: [{
              type: 'Int', id: key, width: node.inputo[key].width
            }]
          }))).concat(
            (Object.keys(node.outputo).map(key => emit({
              type: 'output', items: [{
                type: 'Int', id: key, width: node.outputo[key].width
              }]
            })))
          ).map((e, ei, arr) =>
            e + ((arr.length === ei + 1) ? '' : ',')
          )
        ),
        ');',
        Object.keys(node.signalo).flatMap(key => emit({
          type: node.signalo[key].type, items: [{
            type: 'Int', id: key, width: node.signalo[key].width
          }]
        })),
        node.items.flatMap(emit),
        'endmodule',
        ''
      );
  case 'wire':
  case 'reg':
    return node.items.flatMap(item =>
      node.type.padEnd(7) + emit(item) + ';'); // TODO: combine multiple definitions
  case 'input':
  case 'output':
    return node.items.map(item =>
      node.type.padEnd(7) + emit(item));
  case 'assign':
    return ['assign ' + node.lhs + ' = ' + emit(node.rhs)];
  default:
    return emitType(node);
  }
};

module.exports = emit;
