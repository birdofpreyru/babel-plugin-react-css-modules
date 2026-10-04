import type { NodePath } from '@babel/traverse';

import { optionsDefaults } from './schemas/optionsDefaults';
import type { OptionsT } from './schemas/optionsSchema';

import type { StatsT } from './types';

export function attributeNameExists(
  programPath: NodePath,
  stats: StatsT,
): boolean {
  let exists = false;

  let attributeNames: OptionsT['attributeNames']
    = optionsDefaults.attributeNames;

  if (stats.opts.attributeNames) {
    attributeNames = { ...attributeNames, ...stats.opts.attributeNames };
  }

  programPath.traverse({
    JSXAttribute(attributePath) {
      if (exists) {
        return;
      }

      const attribute = attributePath.node;

      if (
        typeof attribute.name !== 'undefined'
        && typeof attribute.name.name === 'string'
        && typeof attributeNames[attribute.name.name] === 'string'
      ) {
        exists = true;
      }
    },
  });

  return exists;
}
