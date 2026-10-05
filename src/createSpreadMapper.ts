import type { NodePath } from '@babel/traverse';

import {
  type Expression,
  cloneNode,
  memberExpression,
  binaryExpression,
  conditionalExpression,
  stringLiteral,
  logicalExpression,
  identifier,
  isJSXSpreadAttribute,
} from '@babel/types';

import { optionsDefaults } from './optionsDefaults';
import type { OptionsT } from './optionsSchema';
import type { StatsT } from './types';

/** Map: destination name > member expression. */
type ResT = Record<string, Expression>;

export function createSpreadMapper(path: NodePath, stats: StatsT): ResT {
  const result: ResT = {};

  let attributeNames: OptionsT['attributeNames']
    = optionsDefaults.attributeNames;

  if (stats.opts.attributeNames) {
    attributeNames = { ...attributeNames, ...stats.opts.attributeNames };
  }

  const attributes = Object
    .entries(attributeNames)
    .filter((pair) => pair[1]);

  const attributeKeys = attributes.map((pair) => pair[0]);

  if (!('openingElement' in path.node)) throw Error('Unexpected node type');

  const spreadAttributes = path.node.openingElement.attributes
    .filter((attribute) => isJSXSpreadAttribute(attribute));

  for (const spread of spreadAttributes) {
    for (const attributeKey of attributeKeys) {
      const destinationName = attributeNames[attributeKey];
      if (!destinationName) throw Error('Missing destination name');

      if (result[destinationName]) {
        result[destinationName] = binaryExpression(
          '+',
          result[destinationName],
          conditionalExpression(
            cloneNode(spread.argument),
            binaryExpression(
              '+',
              stringLiteral(' '),
              logicalExpression(
                '||',
                memberExpression(
                  cloneNode(spread.argument),
                  identifier(destinationName),
                ),
                stringLiteral(''),
              ),
            ),
            stringLiteral(''),
          ),
        );
      } else {
        result[destinationName] = conditionalExpression(
          cloneNode(spread.argument),
          logicalExpression(
            '||',
            memberExpression(
              cloneNode(spread.argument),
              identifier(destinationName),
            ),
            stringLiteral(''),
          ),
          stringLiteral(''),
        );
      }
    }
  }

  return result;
}
