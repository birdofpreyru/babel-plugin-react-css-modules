/* eslint-disable import/no-extraneous-dependencies */

import { defineConfig } from 'eslint/config';
import eslintConfigs from '@dr.pogodin/eslint-configs';

export default defineConfig([
  { ignores: [
    'dist/',
    'test/fixtures/**/input.js',
    'test/fixtures/**/output.{js,mjs}',
  ] },
  eslintConfigs.configs.javascript,
  eslintConfigs.configs.typescript,
  eslintConfigs.configs.react,
  {
    extends: [eslintConfigs.configs.jest],
    files: ['test/**'],
  },
  {
    rules: {
      // TODO: This rules fails for some reason on some imports,
      // most probably a bug in Perfectionist rules. Let's just ignore it for now.
      'perfectionist/sort-named-imports': 'off',
    },
  },
]);
