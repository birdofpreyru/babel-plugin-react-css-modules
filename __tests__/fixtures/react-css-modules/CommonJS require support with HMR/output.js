"use strict";

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept("./b.css", function () {
    require("./b.css");
  });
}
if (import.meta.webpackHot) {
  import.meta.webpackHot.accept("./a.css", function () {
    require("./a.css");
  });
}
const aStyles = require('./a.css');
require('./b.css');
<div className="a__a1"></div>;
<div className="b__b1"></div>;
