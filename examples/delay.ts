import { match } from 'ts-pattern';
import { genInterfaces, timeout } from '../fwrd/mod.ts';
import * as Pending from './pending.ts';
import * as Timer from './timer.ts';

export enum State {
  delayed,
  caughtUp,
}

export enum Events {
  catchUp,
  putBack,
}

export type Event = Events;

const handle = (s: State, e: Event) =>
  Promise.resolve(
    match(e)
      .with(Events.catchUp, () => s == State.delayed ? State.caughtUp : s)
      .with(Events.putBack, () => s == State.caughtUp ? State.delayed : s)
      .run(),
  );

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
);

export const children = defineChildren({
  [State.delayed]: (fetch) => {
    // I probably need a way to set context on initialization so that value like 2000 can be passed by the user of the machine
    letChildrenDoActualWorks(2000, async () => {
      const { forward } = fetch();
      await forward(Events.catchUp);
    });
  },
});

type GenericCallback = () => void;

function letChildrenDoActualWorks(ms: number, done: GenericCallback) {
  const reaction = Pending.defineReaction({
    [Pending.State.done]: {
      entry: () => {
        done();
      },
    },
  });

  const children = genChildrenForPendingMachine(ms);

  Pending.createMachine(Pending.State.entered, { reaction, children });
}

const genChildrenForPendingMachine = (ms: number) =>
  Pending.defineChildren({
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
