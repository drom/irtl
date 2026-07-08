'use strict';

const { mkdirSync } = require('fs');
const { build } = require('esbuild');

mkdirSync('build', { recursive: true });

// UMD wrapper so the bundle works with CommonJS require, AMD/d3-require
// (Observable notebooks), and a plain browser global. esbuild has no native
// UMD format, so we wrap its IIFE output with a banner/footer.
const banner =
  '(function(g,f){' +
  'typeof exports==="object"&&typeof module!=="undefined"?module.exports=f():' +
  'typeof define==="function"&&define.amd?define(f):' +
  '((g=typeof globalThis!=="undefined"?globalThis:g||self).irtl=f());' +
  '})(this,function(){';
const footer = 'return irtl;});';

build({
  entryPoints: ['lib/index.js'],
  bundle: true,
  format: 'iife',
  globalName: 'irtl',
  banner: { js: banner },
  footer: { js: footer },
  outfile: 'build/irtl.js'
}).catch(() => process.exit(1));
