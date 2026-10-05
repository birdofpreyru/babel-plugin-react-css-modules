export default {
  plugins: [
    ['babel-plugin-transform-import-meta', { module: 'ES6' }],
  ],
  presets: [
    ['@babel/env', { modules: 'commonjs' }],
    '@babel/typescript',
  ],
  targets: 'maintained node versions',
};
