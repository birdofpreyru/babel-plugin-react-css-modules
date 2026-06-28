/* global module */

const modulesToTransform = [
  '@babel',
  'babel-plugin-external-helpers',
  'babel-plugin-polyfill-corejs3',
  'import-meta-resolve',
  'js-tokens',
  'obug',
];

module.exports = {
  modulePathIgnorePatterns: [
    '/test/fixtures/',
  ],
  testEnvironment: 'node',
  testRegex: './test/.+\\.js$',
  transformIgnorePatterns: [
    `/node_modules/(?!${modulesToTransform.join('|')})`,
  ],
};
