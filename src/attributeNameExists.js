// @flow

import { NodePath } from '@babel/core';

import optionsDefaults from './schemas/optionsDefaults';

const attributeNameExists = (
  programPath: typeof NodePath,
  stats: any,
): boolean => {
  let exists = false;

  let { attributeNames } = optionsDefaults;

  if (stats.opts && stats.opts.attributeNames) {
    attributeNames = { ...attributeNames, ...stats.opts.attributeNames };
  }

  programPath.traverse({
    JSXAttribute(attributePath: typeof NodePath) {
      if (exists) {
        return;
      }

      const attribute = attributePath.node;

      if (typeof attribute.name !== 'undefined' && typeof attributeNames[attribute.name.name] === 'string') {
        exists = true;
      }
    },
  });

  return exists;
};

export default attributeNameExists;
