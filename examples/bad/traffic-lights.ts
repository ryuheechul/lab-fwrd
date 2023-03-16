import { match, P } from 'ts-pattern';
import { genAPI, noContext, timeout } from '../../fwrd/mod.ts';

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

const { defineReaction, defineMachine, defineHandle } = genAPI<State, Event>();

const handle = defineHandle(async ({ state, event }) =>
  await match(event)
    .with(delayedNext(P.number), async ({ delay }) => {
      await timeout(delay * 1000);
      return match(state)
        .with(State.green, () => State.yellow)
        .with(State.yellow, () => State.red)
        .with(State.red, () => State.green)
        .run();
    })
    .run()
);

const { initialForward } = defineMachine({ ...noContext, handle });

function contextPerState(state: State) {
  return match(state)
    .with(State.green, () => ({ name: 'green', delay: 3 }))
    .with(State.yellow, () => ({ name: 'yellow', delay: 1 }))
    .with(State.red, () => ({ name: 'red', delay: 2 }))
    .run();
}

// WARNING: consuming reaction from machine itself is bad as the user can't use this feature to subscribe changes
// see the use case of ../traffic-lights.ts instead
const reaction = defineReaction({
  '*': {
    entry: ({ state, forward }) => {
      const { name, delay } = contextPerState(state);
      console.log(`entered ${name} light and will wait for ${delay} seconds`);
      forward(delayedNext(delay));
    },
  },
});

export const startTrafficLights = (state: State) =>
  initialForward(state, { reaction });
