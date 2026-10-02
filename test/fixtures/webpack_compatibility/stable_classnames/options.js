/* global __dirname, module, require */

const path = require('node:path');

const { localIdentNameFactory } = require('../../../../src/utils');

module.exports = {
  plugins: [
    [
      path.resolve(__dirname, '../../../../src'), {
        localIdentName: localIdentNameFactory(
          '[path]__[local]__[hash:base64:5]',
        ),
      },
    ],
  ],
  sourceType: 'module',
};
