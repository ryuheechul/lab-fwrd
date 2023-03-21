import { match } from 'ts-pattern';
import { genAPI } from '../fwrd/mod.ts';
import * as Pending from './pending.ts';
import * as Timer from './timer.ts';

// this "Delay" machine is actually very similar to "Timer" machine
// but still uses "Timer" and "Pending" just to demonstrate the use case of a creating a new machine by simply assembling children machines

export enum State {
  delayed,
  caughtUp,
}

export enum Events {
  catchUp,
  putBack,
}

export type Event = Events;

type Context = {
  delay: number;
};

export const {
  defineMachine,
  defineReaction,
  defineChildren,
  defineHandle,
} = genAPI<
  State,
  Event,
  Context
>();

const handle = defineHandle(({ state, event }) =>
  match(event)
    .with(Events.catchUp, () => state == State.delayed ? State.caughtUp : state)
    .with(Events.putBack, () => state == State.caughtUp ? State.delayed : state)
    .run()
);

const children = defineChildren({
  [State.delayed]: (obtain) => {
    const { context } = obtain();
    letChildrenDoActualWorks(context.delay, async () => {
      const { forward } = obtain();
      await forward(Events.catchUp);
    });
  },
});

export const {
  initialForward,
  createMachine,
} = defineMachine({ initialContext: { delay: 1000 }, handle, children });

type GenericCallback = () => void;

function letChildrenDoActualWorks(ms: number, done: GenericCallback) {
  const reaction = Pending.defineReaction({
    [Pending.State.done]: {
      entry: () => {
        done();
      },
    },
  });

  const init = genChildrenForPendingMachine(ms);

  Pending.createMachine(Pending.State.entered, { reaction, init });
}

const genChildrenForPendingMachine = (ms: number) =>
  Pending.defineObtainHook((obtain) => {
    const reaction = Timer.defineReaction({
      [Timer.State.started]: {
        'entry': async () => {
          const { forward } = obtain();
          await forward(Pending.Events.startPending);
        },
      },
      [Timer.State.ended]: {
        'entry': () => {
          const { forward } = obtain();
          forward(Pending.Events.markDone);
        },
      },
    });

    Timer.createMachine(Timer.State.started, { reaction, context: { ms } });
  });
