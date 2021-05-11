'use strict';

const pkg = require('../package.json');
const emitFirrtl = require('./emit-firrtl.js');
const emitVerilog = require('./emit-verilog.js');

exports.version = pkg.version;
exports.emitFirrtl = emitFirrtl;
exports.emitVerilog = emitVerilog;
