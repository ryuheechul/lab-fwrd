import { match } from 'ts-pattern';
import { genAPI } from '../fwrd/mod.ts';
import * as Delay from './delay.ts';

export enum State {
  green,
  yellow,
  red,
}

// simple events that will not export in this case
enum Events {
  next,
}

export type Event = Events;

type Info = {
  name: string;
  delay: number;
};

const info = (name: string, delay: number): Info => ({ name, delay });

type Context = Record<State, Info>;

export const {
  defineMachine,
  defineChildren,
  defineInit,
  defineReaction,
  defineObtainHook,
  defineHandle,
  defineContext,
} = genAPI<
  State,
  Event,
  Context
>();

const initialContext = defineContext({
  [State.green]: info('green', 3),
  [State.yellow]: info('green', 1),
  [State.red]: info('green', 2),
});

const handle = defineHandle(({ state, event }) =>
  match(event)
    .with(Events.next, () => {
      return match(state)
        .with(State.green, () => State.yellow)
        .with(State.yellow, () => State.red)
        .with(State.red, () => State.green)
        .run();
    })
    .run()
);

const letChildrenDoActualWorks = defineObtainHook((obtain) => {
  const reaction = Delay.defineReaction({
    [Delay.State.caughtUp]: {
      entry: async () => {
        const { forward } = obtain();
        await forward(Events.next);
      },
    },
  });

  const { state, context: thisContext } = obtain();
  const { delay } = thisContext[state];
  const context = { delay: delay * 1000 };

  Delay.initialForward(Delay.State.delayed, { reaction, context });
});

const children = defineChildren({
  [State.green]: letChildrenDoActualWorks,
  [State.yellow]: letChildrenDoActualWorks,
  [State.red]: letChildrenDoActualWorks,
});

export const { initialForward, createMachine } = defineMachine({
  initialContext,
  handle,
  children,
});
