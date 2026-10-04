import type { NodePath } from '@babel/traverse';

import {
  type Expression,
  type JSXElement,
  cloneNode,
  isStringLiteral,
  isJSXExpressionContainer,
  jsxExpressionContainer,
  binaryExpression,
  stringLiteral,
} from '@babel/types';

export function handleSpreadClassName(
  path: NodePath<JSXElement>,
  destinationName: string,
  classNamesFromSpread: Expression,
): void {
  const destinationAttribute = path.node.openingElement.attributes.find(
    (attribute) => 'name' in attribute
      && attribute.name.name === destinationName,
  );

  if (!destinationAttribute) {
    return;
  }

  if (
    'value' in destinationAttribute
    && isStringLiteral(destinationAttribute.value)
  ) {
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
  } else if (
    'value' in destinationAttribute
    && isJSXExpressionContainer(destinationAttribute.value)
  ) {
    if (destinationAttribute.value.expression.type === 'JSXEmptyExpression') {
      throw Error('Unexpected destination attribute value expression');
    }
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
}
