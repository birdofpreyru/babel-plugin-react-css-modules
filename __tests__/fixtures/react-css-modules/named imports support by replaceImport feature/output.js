"use strict";

const A = {
  "classNameA1": "a__classNameA1",
  "classNameA2": "a__classNameA2"
};
const classNameB1 = "b__classNameB1",
  cnb2 = "b__classNameB2",
  badName;
const C = {
    "classNameC1": "c__classNameC1",
    "classNameC2": "c__classNameC2"
  },
  classNameC1 = "c__classNameC1",
  cnc2 = "c__classNameC2";
<div className="a__classNameA1"></div>;
<div className="a__classNameA1"></div>;
<div className="b__classNameB1"></div>;
<div className="b__classNameB2"></div>;
<div className="c__classNameC1"></div>;
<div className="c__classNameC1"></div>;
