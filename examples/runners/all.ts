// usage examples

import { runner as t } from './traffic-lights.ts';
import { runner as o } from './on-off.ts';
import { runner as d } from './delay.ts';
import { runner as tm } from './timer.ts';
import { runner as p } from './pomodoro-timer.ts';

await p();
tm();
d();
t();
await o();
