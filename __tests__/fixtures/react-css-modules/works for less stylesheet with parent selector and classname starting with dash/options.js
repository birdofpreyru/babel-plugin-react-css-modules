export default {
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
        generateScopedName: '[local]-[hash:base64:10]',
        webpackHotModuleReloading: true,
      },
    ],
  ],
};
