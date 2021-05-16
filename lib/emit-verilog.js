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

const emitType = node =>
  vectorDim(node.width) + node.id;

const emitDefines = signalo => {
  const signals = Object.keys(signalo)
    .map(id => Object.assign({id}, signalo[id]));

  return [].concat(
    '(',
    indent(signals
      .filter(e => e.dir !== undefined)
      .map(e => e.dir.padEnd(7) + emitType(e))
      .map(commap)
    ),
    ');',
    signals
      .filter(e => (e.dir === undefined) && (e.clock === undefined))
      .map(e => 'wire   ' + emitType(e) + ';'),
    signals
      .filter(e => (e.dir === undefined) && (e.clock !== undefined))
      .map(e => 'reg    ' + emitType(e) + ';')
  );
};

let curModule;

const emit = node => {
  if (typeof node === 'string') {
    return node;
  }

  if (binary[node.type]) {
    const pat = binary[node.type];
    return pat[0] +
      (node.items.map(e => emit(e))).join(pat[1]) +
      pat[2];
  }

  if (unary[node.type]) {
    return unary[node.type] + '(' + (node.items.map(e => emit(e))) + ')';
  }

  let dstDef;
  switch (node.type) {
  case 'comment':
    return ['// ' + node.value];
  case 'circuit':
    return ['// ' + node.type + ' ' + node.name]
      .concat(node.items.flatMap(emit));
  case 'module':
    curModule = node;
    return [node.type + ' ' + node.name].concat(
      emitDefines(node.defo),
      node.items.flatMap(emit),
      'endmodule',
      ''
    );
  case 'repeat':
    return '{' + node.items[1] +'{' + emit(node.items[0]) + '}}';
  case 'bits':
    return node.items.flatMap(emit) + bits(node.hi, node.lo);
  case 'wire':
  case 'reg':
    return node.type.padEnd(7) + emitType(node.body) + ';';
  case 'input':
  case 'output':
    return node.items.map(item =>
      node.type.padEnd(7) + emit(item));
  case 'assign':
    dstDef = curModule.defo[node.dst];
    if (dstDef && dstDef.clock) {
      if (dstDef.reset === undefined) {
        return ['always @(posedge ' + dstDef.clock + ') ' + node.dst + ' <= ' + emit(node.src) + ';'];
      }
      if (dstDef.sync) {
        return ['always @(posedge ' + dstDef.clock + ') ' +
          'if (' + (dstDef.reset) + ') ' +
          node.dst + ' <= ' + dstDef.width + '\'d' + (dstDef.resetValue || 0) + '; ' +
          'else ' + node.dst + ' <= ' + emit(node.src) + ';'
        ];
      }
      return ['always @(posedge ' + dstDef.clock + ' or posedge ' + dstDef.reset + ') ' +
        'if (' + (dstDef.reset) + ') ' +
        node.dst + ' <= ' + dstDef.width + '\'d' + (dstDef.resetValue || 0) + '; ' +
        'else ' + node.dst + ' <= ' + emit(node.src) + ';'
      ];
    }
    return ['assign ' + node.dst + ' = ' + emit(node.src) + ';'];
  default:
    return emitType(node);
  }
};

module.exports = emit;
