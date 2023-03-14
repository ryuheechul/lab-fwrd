import { match, P } from 'ts-pattern';
import { genDefineInit, genInterfaces, timeout } from '../fwrd/mod.ts';
import * as OnOff from './on-off.ts';

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

const defineInit = genDefineInit<State, Event>();

const init = defineInit((fetch) => {
  const { defineReaction, initialForward, delayedToggle } = OnOff;

  const reaction = defineReaction({
    '*': {
      entry: async (_onOffState, onOffForward) => {
        const { forward } = fetch();

        const state = await forward(delayedNext(0));
        const { name, delay } = contextPerState(state);
        console.log(`entered ${name} light and will wait for ${delay} seconds`);
        onOffForward(delayedToggle(delay));
      },
    },
  });

  initialForward(OnOff.State.off, { reaction });
});

export const { createMachine, defineReaction } = genInterfaces<State, Event>(
  handle,
  init,
);
