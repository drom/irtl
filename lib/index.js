'use strict';

const pkg = require('../package.json');
const emitFirrtl = require('./emit-firrtl.js');

exports.version = pkg.version;
exports.emitFirrtl = emitFirrtl;
