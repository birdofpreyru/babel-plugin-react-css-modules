/* global module */

module.exports = {
  plugins: [
    [
      '../../../../src',
      {
        filetypes: {
          '.less': {
            plugins: ['postcss-nested'],
            syntax: 'postcss-less',
          },
        },
        localIdentName: '[local]-[hash:base64:10]',
        webpackHotModuleReloading: true,
      },
    ],
  ],
};
