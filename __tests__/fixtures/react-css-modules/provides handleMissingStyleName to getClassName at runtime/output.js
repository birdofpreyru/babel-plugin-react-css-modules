"use strict";

var _getClassName2 = _interopRequireDefault(require("@dr.pogodin/babel-plugin-react-css-modules/dist/browser/getClassName.js"));
require("./foo.css");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const _styleModuleImportMap = {
  "./foo.css": {
    "a-b": "foo__a-b"
  }
};
const styleNameFoo = 'a-c';
<div className={(0, _getClassName2.default)(styleNameFoo, _styleModuleImportMap, {
  "autoResolveMultipleImports": true,
  "handleMissingStyleName": "ignore"
})}></div>;
