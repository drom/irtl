'use strict';

const pkg = require('../package.json');
const emitFirrtl = require('./emit-firrtl.js');
const emitVerilog = require('./emit-verilog.js');
const createModule = require('./create-module.js');
const elements = require('./elements.js');

exports.version = pkg.version;
exports.emitFirrtl = emitFirrtl;
exports.emitVerilog = emitVerilog;
exports.createModule = createModule;
exports.elements = elements;
