// @flow

import BabelTypes, {
  binaryExpression,
  Identifier,
  isJSXExpressionContainer,
  isStringLiteral,
  jSXAttribute,
  JSXAttribute,
  jSXExpressionContainer,
  jSXIdentifier,
} from '@babel/types';
import conditionalClassMerge from './conditionalClassMerge';
import createObjectExpression from './createObjectExpression';
import optionsDefaults from './schemas/optionsDefaults';
import type {
  GetClassNameOptionsType,
} from './types';

export default (
  types: typeof BabelTypes,
  path: Object,
  sourceAttribute: typeof JSXAttribute,
  destinationName: string,
  importedHelperIndentifier: typeof Identifier,
  styleModuleImportMapIdentifier: typeof Identifier,
  options: GetClassNameOptionsType,
): void => {
  const expressionContainerValue = sourceAttribute.value;
  const destinationAttribute = path.node.openingElement.attributes
    .find((attribute) => typeof attribute.name !== 'undefined' && attribute.name.name === destinationName);

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

  const args = [
    expressionContainerValue.expression,
    styleModuleImportMapIdentifier,
  ];

  // Only provide options argument if the options are something other than default
  // This helps save a few bits in the generated user code
  if (options.handleMissingStyleName !== optionsDefaults.handleMissingStyleName
    || options.autoResolveMultipleImports !== optionsDefaults.autoResolveMultipleImports) {
    args.push(createObjectExpression(types, options));
  }

  const styleNameExpression = types.callExpression(
    types.clone(importedHelperIndentifier),
    args,
  );

  if (destinationAttribute) {
    if (isStringLiteral(destinationAttribute.value)) {
      path.node.openingElement.attributes.push(jSXAttribute(
        jSXIdentifier(destinationName),
        jSXExpressionContainer(
          binaryExpression(
            '+',
            types.stringLiteral(`${destinationAttribute.value.value} `),
            styleNameExpression,
          ),
        ),
      ));
    } else if (isJSXExpressionContainer(destinationAttribute.value)) {
      path.node.openingElement.attributes.push(jSXAttribute(
        jSXIdentifier(destinationName),
        jSXExpressionContainer(
          conditionalClassMerge(
            destinationAttribute.value.expression,
            styleNameExpression,
          ),
        ),
      ));
    } else {
      throw new Error(`Unexpected attribute value: ${destinationAttribute.value}`);
    }
  } else {
    path.node.openingElement.attributes.push(jSXAttribute(
      jSXIdentifier(destinationName),
      jSXExpressionContainer(
        styleNameExpression,
      ),
    ));
  }
};
