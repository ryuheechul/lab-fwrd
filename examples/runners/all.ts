// usage examples

import { runner as t } from './traffic-lights.ts';
import { runner as o } from './on-off.ts';
import { runner as d } from './delay.ts';
import { runner as tm } from './timer.ts';

tm();
d();
t();
await o();
