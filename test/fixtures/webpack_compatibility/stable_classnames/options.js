/* global __dirname, module, require */

const path = require('node:path');

const { localIdentNameFactory } = require('../../../../build/utils');

module.exports = {
  plugins: [
    [
      path.resolve(__dirname, '../../../../build'), {
        localIdentName: localIdentNameFactory(
          '[path]__[local]__[hash:base64:5]',
        ),
      },
    ],
  ],
  sourceType: 'module',
};
