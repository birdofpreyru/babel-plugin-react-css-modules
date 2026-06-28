/* global module */

module.exports = {
  plugins: [
    '@babel/plugin-transform-flow-strip-types',
    ['babel-plugin-transform-import-meta', { module: 'ES6' }],
  ],
  presets: ['@babel/env'],
  targets: 'maintained node versions',
};
