// @flow

import { NodePath } from '@babel/traverse';

import {
  cloneNode,
  // type Expression,
  isStringLiteral,
  isJSXExpressionContainer,
  jsxExpressionContainer,
  binaryExpression,
  stringLiteral,
} from '@babel/types';

const handleSpreadClassName = (
  path: typeof NodePath,
  destinationName: string,
  classNamesFromSpread: typeof binaryExpression, // TODO: It should be Expression type from '@babel/types', but I am not sure now, how to express it for flow.
) => {
  const destinationAttribute = path.node.openingElement.attributes
    .find((attribute) => typeof attribute.name !== 'undefined' && attribute.name.name === destinationName);

  if (!destinationAttribute) {
    return;
  }

  if (isStringLiteral(destinationAttribute.value)) {
    destinationAttribute.value = jsxExpressionContainer(
      binaryExpression(
        '+',
        cloneNode(destinationAttribute.value),
        binaryExpression(
          '+',
          stringLiteral(' '),
          classNamesFromSpread,
        ),
      ),
    );
  } else if (isJSXExpressionContainer(destinationAttribute.value)) {
    destinationAttribute.value = jsxExpressionContainer(
      binaryExpression(
        '+',
        cloneNode(destinationAttribute.value.expression),
        binaryExpression(
          '+',
          stringLiteral(' '),
          classNamesFromSpread,
        ),
      ),
    );
  }
};

export default handleSpreadClassName;
