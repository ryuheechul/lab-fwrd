import { match, P } from 'ts-pattern';
import { genAPI, noContext, timeout } from '../../fwrd/mod.ts';
import * as OnOff from '../on-off.ts';

export enum State {
  green,
  yellow,
  red,
}

// simple events that will not export in this case
enum Events {
  next,
}

// an event with parameter
export type DelayedNext = {
  _event: Events.next;
  delay: number; // in sec
};

// helper function to create On event
export const delayedNext = (
  delay: DelayedNext['delay'] | typeof P._,
): DelayedNext => ({
  _event: Events.next,
  delay: delay as DelayedNext['delay'],
});

export type Event = DelayedNext;

const handle = async (s: State, e: Event) =>
  await match(e)
    .with(delayedNext(P.number), async ({ delay }: DelayedNext) => {
      await timeout(delay * 1000);
      return match(s)
        .with(State.green, () => State.yellow)
        .with(State.yellow, () => State.red)
        .with(State.red, () => State.green)
        .run();
    })
    .run();

export function contextPerState(state: State) {
  return match(state)
    .with(State.green, () => ({ name: '[green]', delay: 3 }))
    .with(State.yellow, () => ({ name: '[yellow]', delay: 1 }))
    .with(State.red, () => ({ name: '[red]', delay: 2 }))
    .run();
}

export const {
  defineMachine,
  defineChildren,
  defineInit,
  defineReaction,
  defineObtainHook,
} = genAPI<
  State,
  Event
>();

const letChildrenDoActualWorks = defineObtainHook((obtain) => {
  const { defineReaction, initialForward, delayedToggle } = OnOff;

  const reaction = defineReaction({
    '*': {
      entry: async ({ forward: onOffForward }) => {
        const { forward } = obtain();
        // WARNING: now the logic here doesn't make not much sense after some refactoring and:
        // - changing the delayed number other 0 would make it halt indefinitely
        // - or light changes immediately with 0 which is also not practical
        // see the use case of ../traffic-lights.ts instead
        const { state } = await forward(delayedNext(0));
        const { name, delay } = contextPerState(state);
        console.log(`entered ${name} light and will wait for ${delay} seconds`);

        onOffForward(delayedToggle(delay));
      },
    },
  });

  initialForward(OnOff.State.off, { reaction });
});

const children = defineChildren({
  [State.green]: (fetch) => {
    letChildrenDoActualWorks(fetch);
  },
  [State.yellow]: (fetch) => {
    letChildrenDoActualWorks(fetch);
  },
  [State.red]: (fetch) => {
    letChildrenDoActualWorks(fetch);
  },
});

export const { initialForward, createMachine } = defineMachine({
  ...noContext,
  handle,
  children,
});
