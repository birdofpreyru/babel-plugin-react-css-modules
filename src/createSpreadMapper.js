// @flow

import { NodePath } from '@babel/traverse';

import {
  cloneNode,
  // type Expression,
  memberExpression,
  binaryExpression,
  conditionalExpression,
  stringLiteral,
  logicalExpression,
  identifier,
  isJSXSpreadAttribute,
} from '@babel/types';

import optionsDefaults from './schemas/optionsDefaults';

const createSpreadMapper = (path: typeof NodePath, stats: any): {
  [destinationName: string]: typeof memberExpression, // TODO: It should be Expression type from '@babel/types', but I am not sure now, how to express it for flow.
  ...
} => {
  const result = {};

  let { attributeNames } = optionsDefaults;

  if (stats.opts && stats.opts.attributeNames) {
    attributeNames = { ...attributeNames, ...stats.opts.attributeNames };
  }

  const attributes = Object
    .entries(attributeNames)
    .filter((pair) => pair[1]);

  const attributeKeys = attributes.map((pair) => pair[0]);

  const spreadAttributes = path.node.openingElement.attributes
    .filter((attribute) => isJSXSpreadAttribute(attribute));

  spreadAttributes.forEach((spread) => {
    attributeKeys.forEach((attributeKey) => {
      const destinationName = attributeNames[attributeKey];

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
    });
  });

  return result;
};

export default createSpreadMapper;
