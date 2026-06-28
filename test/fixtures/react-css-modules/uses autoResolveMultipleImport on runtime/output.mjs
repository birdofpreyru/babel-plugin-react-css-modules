import _getClassName from "@dr.pogodin/babel-plugin-react-css-modules/dist/browser/getClassName.js";
import './foo.css';
import './bar.css';
const _styleModuleImportMap = {
  "./foo.css": {
    "b": "foo__b"
  },
  "./bar.css": {
    "a": "bar__a"
  }
};
const styleNameA = 'a';
const styleNameB = 'b';
<div className={_getClassName(styleNameA, _styleModuleImportMap)}></div>;
<div className={_getClassName(styleNameB, _styleModuleImportMap)}></div>;
