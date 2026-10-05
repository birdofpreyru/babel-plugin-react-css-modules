import type { NodePath } from '@babel/core';

import {
  type ArgumentPlaceholder,
  type Expression,
  type Identifier,
  type JSXAttribute,
  type SpreadElement,
  callExpression,
  clone,
  binaryExpression,
  isJSXExpressionContainer,
  isStringLiteral,
  jsxAttribute,
  jsxExpressionContainer,
  jsxIdentifier,
  stringLiteral,
  type JSXElement,
} from '@babel/types';

import { conditionalClassMerge } from './conditionalClassMerge';
import { createObjectExpression } from './createObjectExpression';
import { optionsDefaults } from './optionsDefaults';
import type { GetClassNameOptionsType } from './types';

export function replaceJsxExpressionContainer(
  path: NodePath<JSXElement>,
  sourceAttribute: JSXAttribute,
  destinationName: string,
  importedHelperIndentifier: Identifier,
  styleModuleImportMapIdentifier: Identifier,
  options: GetClassNameOptionsType,
): void {
  const expressionContainerValue = sourceAttribute.value;
  const destinationAttribute = path.node.openingElement.attributes
    .find((attribute) => 'name' in attribute && attribute.name.name === destinationName);

  if (destinationAttribute) {
    path.node.openingElement.attributes.splice(
      path.node.openingElement.attributes.indexOf(destinationAttribute),
      1,
    );
  }

  path.node.openingElement.attributes.splice(
    path.node.openingElement.attributes.indexOf(sourceAttribute),
    1,
  );

  if (!expressionContainerValue) {
    throw Error('Missing experession container value');
  }

  if (!('expression' in expressionContainerValue)) {
    throw Error('Unexpected expression container value kind');
  }

  if (expressionContainerValue.expression.type === 'JSXEmptyExpression') {
    throw Error('Unexpected empty expression');
  }

  const args: Array<ArgumentPlaceholder | Expression | SpreadElement> = [
    expressionContainerValue.expression,
    styleModuleImportMapIdentifier,
  ];

  // Only provide options argument if the options are something other than default
  // This helps save a few bits in the generated user code
  if (
    options.handleMissingStyleName !== optionsDefaults.handleMissingStyleName
    || options.autoResolveMultipleImports
    !== optionsDefaults.autoResolveMultipleImports
  ) {
    args.push(createObjectExpression(options));
  }

  // _arguments: (Expression | SpreadElement | ArgumentPlaceholder)[]

  const styleNameExpression = callExpression(
    clone(importedHelperIndentifier),
    args,
  );

  if (destinationAttribute) {
    if (
      'value' in destinationAttribute
      && isStringLiteral(destinationAttribute.value)
    ) {
      path.node.openingElement.attributes.push(jsxAttribute(
        jsxIdentifier(destinationName),
        jsxExpressionContainer(
          binaryExpression(
            '+',
            stringLiteral(`${destinationAttribute.value.value} `),
            styleNameExpression,
          ),
        ),
      ));
    } else if (
      'value' in destinationAttribute
      && isJSXExpressionContainer(destinationAttribute.value)
    ) {
      if (destinationAttribute.value.expression.type === 'JSXEmptyExpression') {
        throw Error('Unexpected destination attribute value expression type');
      }
      path.node.openingElement.attributes.push(jsxAttribute(
        jsxIdentifier(destinationName),
        jsxExpressionContainer(
          conditionalClassMerge(
            destinationAttribute.value.expression,
            styleNameExpression,
          ),
        ),
      ));
    } else {
      throw new Error(`Unexpected attribute value: ${
        'value' in destinationAttribute && destinationAttribute.value

          // eslint-disable-next-line @typescript-eslint/no-base-to-string
          ? destinationAttribute.value.toString() : ''
      }`);
    }
  } else {
    path.node.openingElement.attributes.push(jsxAttribute(
      jsxIdentifier(destinationName),
      jsxExpressionContainer(
        styleNameExpression,
      ),
    ));
  }
}
