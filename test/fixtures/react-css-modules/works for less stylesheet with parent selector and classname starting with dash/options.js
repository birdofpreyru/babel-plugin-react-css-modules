/* global module */

module.exports = {
  plugins: [
    [
      '../../../../build',
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
