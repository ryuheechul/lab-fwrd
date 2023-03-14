import { match } from 'ts-pattern';
import { genDefineInit, genInterfaces, timeout } from '../fwrd/mod.ts';
import * as Pending from './pending.ts';
import * as Timer from './timer.ts';

export enum State {
  delayed,
  caughtUp,
}

export enum Events {
  catchup,
}

export type Event = Events;

const handle = (s: State, e: Event) =>
  Promise.resolve(
    match(e)
      .with(Events.catchup, () => s == State.delayed ? State.caughtUp : s)
      .run(),
  );

const defineInit = genDefineInit<State, Event>();

const init = defineInit((fetch) => {
  const { forward } = fetch();

  // i probably need a way to set context on initialization
  kickOff(2000, () => {
    forward(Events.catchup);
  });
});

export const {
  initialForward,
  createMachine,
  defineReaction,
  defineChildren,
} = genInterfaces<
  State,
  Event
>(
  handle,
  init,
);

type GenericCallback = () => void;

function kickOff(ms: number, markDone: GenericCallback) {
  const reaction = Pending.defineReaction({
    [Pending.State.entered]: {
      entry: () => {
        // console.log('pending entered');
      },
    },
    [Pending.State.pending]: {
      entry: () => {
        // console.log('pending pending');
      },
    },
    [Pending.State.done]: {
      entry: () => {
        markDone();
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
