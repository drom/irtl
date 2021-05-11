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
        node.items.flatMap(emit),
        'endmodule',
        ''
      );
  case 'io':
    return ['('].concat(
      indent(
        node.items.flatMap((e, ei, arr) =>
          emit(e) + (((e.type === 'comment') || (arr.length === ei + 1)) ? '' : ','))
      ),
      ');'
    );
  case 'wire':
    return [node.type.padEnd(7) + emit(node.items[0]) + ';'];
  case 'input':
  case 'output':
    return [node.type.padEnd(7) + emit(node.items[0])];
  case 'assign':
    return ['assign ' + node.lhs + ' = ' + emit(node.rhs)];
  default:
    return emitType(node);
  }
};

module.exports = emit;
