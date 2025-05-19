/* eslint-disable import/no-extraneous-dependencies */

import { defineConfig } from 'eslint/config';
import eslintConfigs from '@dr.pogodin/eslint-configs';

export default defineConfig([
  {
    ignores: [
      '__tests__/**/input.js',
      '__tests__/**/output.{js,mjs}',
      'build/',
    ],
  },
  eslintConfigs.configs.javascript,
  eslintConfigs.configs.typescript,
  {
    extends: [eslintConfigs.configs.jest],
    files: ['__tests__/**'],
  },
]);
