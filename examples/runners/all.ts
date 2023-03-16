// usage examples

import { runner as t } from './traffic-lights.ts';
import { runner as o } from './on-off.ts';
import { runner as d } from './delay.ts';
import { runner as tm } from './timer.ts';
import { runner as p } from './pomodoro-timer.ts';
import { runner as j } from './job.ts';
import { runner as s } from './store.ts';

await s();
await j();
await p();
tm();
d();
t();
await o();
