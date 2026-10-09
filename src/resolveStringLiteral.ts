import type { NodePath } from '@babel/traverse';

import {
  type JSXAttribute,
  type JSXElement,
  isJSXExpressionContainer,
  isStringLiteral,
  stringLiteral,
} from '@babel/types';

import { conditionalClassMerge } from './conditionalClassMerge';
import getClassName from './getClassName';

import type {
  StyleModuleImportMapType,
  GetClassNameOptionsType,
} from './types';

/**
 * Updates the className value of a JSX element using a provided
 * styleName attribute.
 */
export function resolveStringLiteral(
  path: NodePath<JSXElement>,
  styleModuleImportMap: StyleModuleImportMapType,
  sourceAttribute: JSXAttribute,
  destinationName: null | string | undefined,
  options: GetClassNameOptionsType,
): void {
  if (!sourceAttribute.value) throw Error('Missing source attribute value');

  if (!('value' in sourceAttribute.value)) {
    throw Error('Unexpected source attribute value');
  }

  const resolvedStyleName = getClassName(
    sourceAttribute.value.value,
    styleModuleImportMap,
    options,
  );

  const destinationAttribute = path.node.openingElement.attributes
    .find((attribute) => 'name' in attribute && attribute.name.name === destinationName);

  if (destinationAttribute) {
    if (destinationAttribute.type !== 'JSXAttribute') {
      throw Error('Unexpected destination attribute type');
    }
    if (isStringLiteral(destinationAttribute.value)) {
      destinationAttribute.value.value += ` ${resolvedStyleName}`;
    } else if (isJSXExpressionContainer(destinationAttribute.value)) {
      if (destinationAttribute.value.expression.type === 'JSXEmptyExpression') {
        throw Error('Unexpected destination attribute value expression kind');
      }
      destinationAttribute.value.expression = conditionalClassMerge(
        destinationAttribute.value.expression,
        stringLiteral(resolvedStyleName),
      );
    } else {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/restrict-template-expressions
      throw new Error(`Unexpected attribute value:${destinationAttribute.value}`);
    }

    path.node.openingElement.attributes.splice(
      path.node.openingElement.attributes.indexOf(sourceAttribute),
      1,
    );
  } else {
    /* eslint-disable no-param-reassign */
    if (!destinationName) throw Error('Missing destination name');
    sourceAttribute.name.name = destinationName;
    sourceAttribute.value.value = resolvedStyleName;
    /* eslint-enable no-param-reassign */
  }
}
