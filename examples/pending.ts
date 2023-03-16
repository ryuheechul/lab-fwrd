import { match } from 'ts-pattern';
import { genAPI, noContext } from '../fwrd/mod.ts';

export enum State {
  entered,
  pending,
  done,
}

// simple events
export enum Events {
  startPending,
  markDone,
}

export type Event = Events;

export const {
  defineReaction,
  defineChildren,
  defineMachine,
  defineObtainHook,
  defineHandle,
} = genAPI<
  State,
  Event
>();

const handle = defineHandle(({ state, event }) =>
  match(event)
    .with(Events.startPending, () =>
      state == State.entered ? State.pending : state)
    .with(Events.markDone, () =>
      state == State.pending ? State.done : state)
    .run()
);

export const { initialForward, createMachine } = defineMachine({
  ...noContext,
  handle,
});
