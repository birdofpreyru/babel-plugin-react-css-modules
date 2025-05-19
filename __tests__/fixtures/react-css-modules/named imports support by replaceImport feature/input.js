import * as A from './a.css';

import { classNameB1, classNameB2 as cnb2, badName } from './b.css';

import C, { classNameC1, classNameC2 as cnc2 } from './c.css';

<div styleName="classNameA1"></div>;
<div styleName="A.classNameA1"></div>;

<div styleName="classNameB1"></div>;
<div styleName="classNameB2"></div>;

<div styleName="classNameC1"></div>;
<div styleName="C.classNameC1"></div>;
