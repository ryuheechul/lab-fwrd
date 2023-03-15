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

const handle = defineHandle((s: State, e: Event) =>
  match(e)
    .with(Events.startPending, () => s == State.entered ? State.pending : s)
    .with(Events.markDone, () => s == State.pending ? State.done : s)
    .run()
);

export const { initialForward, createMachine } = defineMachine({
  ...noContext,
  handle,
});
