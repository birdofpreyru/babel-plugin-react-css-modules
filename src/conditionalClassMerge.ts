import {
  binaryExpression,
  cloneNode,
  conditionalExpression,
  stringLiteral,
} from '@babel/types';

export default (
  classNameExpression: any,
  styleNameExpression: any,
): any => binaryExpression(
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
