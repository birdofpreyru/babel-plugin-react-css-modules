/* global __dirname, module, require */

const path = require('node:path');

module.exports = {
  plugins: [
    [
      path.resolve(__dirname, '../../../../src'), {
        generateScopedName: '[path]__[local]__[hash:base64:5]',
      },
    ],
  ],
  sourceType: 'module',
};
