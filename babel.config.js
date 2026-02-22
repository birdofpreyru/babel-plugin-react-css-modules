/* global module */

module.exports = {
  plugins: [
    '@babel/plugin-transform-flow-strip-types',
  ],
  presets: [
    [
      '@babel/env',
      {
        targets: {
          node: '20',
        },
      },
    ],
  ],
};
