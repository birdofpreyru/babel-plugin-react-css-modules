import {
  type Expression,
  binaryExpression,
  cloneNode,
  conditionalExpression,
  stringLiteral,
} from '@babel/types';

export function conditionalClassMerge(
  classNameExpression: Expression,
  styleNameExpression: Expression,
): Expression {
  return binaryExpression(
    '+',
    conditionalExpression(
      cloneNode(classNameExpression),
      binaryExpression(
        '+',
        cloneNode(classNameExpression),
        stringLiteral(' '),
      ),
      stringLiteral(''),
    ),
    cloneNode(styleNameExpression),
  );
}
