export default {
  plugins: [
    '@babel/plugin-transform-flow-strip-types',
    '@dr.pogodin/add-import-extension',
  ],
  presets: ['@babel/env'],
  targets: 'maintained node versions',
};
