"use strict";

if (module.hot) {
  module.hot.accept("./b.css", function () {
    require("./b.css");
  });
}
if (module.hot) {
  module.hot.accept("./a.css", function () {
    require("./a.css");
  });
}
const aStyles = require('./a.css');
require('./b.css');
<div className="a__a1"></div>;
<div className="b__b1"></div>;
