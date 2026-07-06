'use strict';

const pkg = require('../package.json');
const emitFirrtl = require('./emit-firrtl.js');
const emitVerilog = require('./emit-verilog.js');
const createModule = require('./create-module.js');
const createCircuit = require('./create-circuit.js');
const elements = require('./elements.js');
const variadics = require('./variadics.js');
const plumb = require('./plumb.js');
const identity = require('./identity.js');
const build = require('./builder.js');
const serialize = require('./serialize.js');

exports.version = pkg.version;
exports.emitFirrtl = emitFirrtl;
exports.emitVerilog = emitVerilog;
exports.createModule = createModule;
exports.createCircuit = createCircuit;
exports.elements = elements;
exports.variadics = variadics;
exports.plumb = plumb;
exports.identity = identity;
exports.build = build;
exports.serialize = serialize;
