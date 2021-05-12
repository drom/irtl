'use strict';

const createModule = name => ({
  type: 'module',
  name,
  inputo: {},
  outputo: {},
  signalo: {},
  items: []
});

module.exports = createModule;
