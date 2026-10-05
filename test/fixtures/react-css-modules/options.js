/**
 * @file Provides the base options object that applies to all tests.
 * https://github.com/babel/babel/blob/master/CONTRIBUTING.md#writing-tests
 */
/* global __dirname, module, require */

const { resolve } = require('node:path');

module.exports = {
  plugins: [
    [
      resolve(__dirname, '../../../build'),
      {
        localIdentName: '[name]__[local]',
      },
    ],
  ],
  presets: [
    [
      '@babel/env',
      {
        targets: {
          node: '18',
        },
      },
    ],
  ],
  sourceType: 'module',
};
