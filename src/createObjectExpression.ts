import {
  type Expression,
  type Node,
  type ObjectExpression,
  type ObjectProperty,
  booleanLiteral,
  isAnyTypeAnnotation,
  objectExpression,
  objectProperty,
  stringLiteral,
} from '@babel/types';

type InputObjectType = Record<string, unknown>;

/**
 * Creates an AST representation of an InputObjectType shape object.
 */
export function createObjectExpression(
  object: InputObjectType,
): ObjectExpression {
  const properties: ObjectProperty[] = [];

  Object.keys(object).forEach((name) => {
    const value = object[name];

    let newValue: Expression | undefined;

    if (!isAnyTypeAnnotation(value as Node)) {
      switch (typeof value) {
        case 'boolean':
          newValue = booleanLiteral(value);
          break;
        case 'object':
          newValue = createObjectExpression(value as InputObjectType);
          break;
        case 'string':
          newValue = stringLiteral(value);
          break;
        case 'undefined':
          return;
        case 'bigint':
        case 'function':
        case 'number':
        case 'symbol':
        default:
          throw new TypeError(`Unexpected type: ${typeof value}`);
      }
    }

    if (newValue === undefined) throw Error('Internal error');
    properties.push(objectProperty(stringLiteral(name), newValue));
  });

  return objectExpression(properties);
}
