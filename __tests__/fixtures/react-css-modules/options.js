/**
 * @file Provides the base options object that applies to all tests.
 * https://github.com/babel/babel/blob/master/CONTRIBUTING.md#writing-tests
 */
import { resolve } from 'path';

export default {
  plugins: [
    [
      resolve(import.meta.dirname, '../../../src'),
      {
        generateScopedName: '[name]__[local]',
      },
    ],
  ],
  presets: [
    [
      '@babel/env',
      {
        targets: {
          node: '18',
        },
      },
    ],
  ],
  sourceType: 'module',
};
