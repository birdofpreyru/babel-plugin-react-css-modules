const modulesToTransform = [
  '@babel',
  'babel-plugin-external-helpers',
  'babel-plugin-polyfill-corejs3',
  'import-meta-resolve',
  'js-tokens',
  'obug',
];

export default {
  modulePathIgnorePatterns: [
    '/test/fixtures/',
  ],
  testEnvironment: 'node',
  testRegex: './test/.+\\.js$',
  transformIgnorePatterns: [
    `/node_modules/(?!${modulesToTransform.join('|')})`,
  ],
};
