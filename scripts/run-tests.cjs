/**
 * Test Runner menggunakan @babel/register untuk mengeksekusi tests/core.test.ts secara langsung
 */
const path = require('path');
module.paths.push('/usr/share/nodejs');

const babelRegister = require('@babel/register');
babelRegister({
  extensions: ['.ts', '.tsx', '.js'],
  presets: [
    ['/usr/share/nodejs/@babel/preset-typescript', { allExtensions: true }],
  ],
  plugins: ['/usr/share/nodejs/@babel/plugin-transform-modules-commonjs'],
  ignore: [/node_modules/],
});

require(path.resolve(__dirname, '../tests/core.test.ts'));
