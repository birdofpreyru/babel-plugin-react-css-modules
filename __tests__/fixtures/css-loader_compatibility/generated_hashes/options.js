import path from 'path';

export default {
  plugins: [
    [
      path.resolve(import.meta.dirname, '../../../../src'), {
        generateScopedName: '[path]__[local]__[hash:base64:5]',
      },
    ],
  ],
  sourceType: 'module',
};
