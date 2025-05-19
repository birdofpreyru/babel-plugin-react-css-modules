import path from 'path';
import { generateScopedNameFactory } from '../../../../src/utils';

export default {
  plugins: [
    [
      path.resolve(import.meta.dirname, '../../../../src'), {
        generateScopedName: generateScopedNameFactory(
          '[path]__[local]__[hash:base64:5]',
        ),
      },
    ],
  ],
  sourceType: 'module',
};
