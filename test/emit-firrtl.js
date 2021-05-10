'use strict';

const chai = require('chai');

const lib = require('../lib/index.js');

const expect = chai.expect;

describe('basic', () => {

  it('emitFirrtl is a function', async () => {
    expect(lib.emitFirrtl).to.be.a('function');
  });

});

/* eslint-env mocha */
