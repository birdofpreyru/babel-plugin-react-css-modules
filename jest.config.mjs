const modulesToTransform = [
  '@babel',
  '@dr.pogodin/postcss-modules-parser',
  'babel-plugin-external-helpers',
  'babel-plugin-polyfill-corejs3',
  'import-meta-resolve',
  'js-tokens',
  'obug',
];

export default {
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: '__coverage__',
  modulePathIgnorePatterns: [
    '/test/fixtures/',
  ],
  testRegex: './test/.+\\.js$',
  transform: {
    '\\.[jt]sx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    `/node_modules/(?!${modulesToTransform.join('|')})`,
  ],
};
