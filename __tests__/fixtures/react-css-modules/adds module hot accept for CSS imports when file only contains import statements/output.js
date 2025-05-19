"use strict";

require("./bar.css");
if (import.meta.webpackHot) {
  import.meta.webpackHot.accept("./bar.css", function () {
    require("./bar.css");
  });
}
