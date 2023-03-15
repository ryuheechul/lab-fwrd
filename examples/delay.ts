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

const handle = defineHandle((s: State, e: Event) =>
  match(e)
    .with(Events.catchUp, () => s == State.delayed ? State.caughtUp : s)
    .with(Events.putBack, () => s == State.caughtUp ? State.delayed : s)
    .run()
);

const children = defineChildren({
  [State.delayed]: (fetch) => {
    const { context } = fetch();
    letChildrenDoActualWorks(context.delay, async () => {
      const { forward } = fetch();
      await forward(Events.catchUp);
    });
  },
});

export const {
  initialForward,
  createMachine,
} = defineMachine({ defaultContext: { delay: 1000 }, handle, children });

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
