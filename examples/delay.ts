import { timeout } from '../fwrd/mod.ts';
import * as Pending from './pending.ts';
import * as Timer from './timer.ts';

export function createMachine(ms: number) {
  const reaction = Pending.defineReaction({
    [Pending.State.entered]: {
      entry: () => {
        console.log('pending entered');
      },
    },
    [Pending.State.pending]: {
      entry: () => {
        console.log('pending pending');
      },
    },
    [Pending.State.done]: {
      entry: () => {
        console.log('pending done');
      },
    },
  });

  const children = Pending.defineChildren({
    [Pending.State.entered]: (fetch) => {
      const reaction = Timer.defineReaction({
        [Timer.State.started]: {
          'entry': async (_s, timerForward) => {
            const { forward } = fetch();
            await forward(Pending.Events.startPending);
            await timeout(ms);
            await timerForward(Timer.Events.wentOff);
          },
        },
        [Timer.State.ended]: {
          'entry': () => {
            const { forward } = fetch();
            forward(Pending.Events.markDone);
          },
        },
      });

      Timer.createMachine(Timer.State.started, { reaction });
    },
  });

  Pending.createMachine(Pending.State.entered, { reaction, children });
}
