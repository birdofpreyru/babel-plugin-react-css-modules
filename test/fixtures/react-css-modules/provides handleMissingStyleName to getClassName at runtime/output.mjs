import _getClassName from "@dr.pogodin/babel-plugin-react-css-modules/dist/browser/getClassName.js";
import './foo.css';
const _styleModuleImportMap = {
  "./foo.css": {
    "a-b": "foo__a-b"
  }
};
const styleNameFoo = 'a-c';
<div className={_getClassName(styleNameFoo, _styleModuleImportMap, {
  "autoResolveMultipleImports": true,
  "handleMissingStyleName": "ignore"
})}></div>;
