'use strict';

const createModule = name => ({
  type: 'module',
  name,
  defo: {},
  items: []
});

module.exports = createModule;
