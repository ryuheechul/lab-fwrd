import { match } from 'ts-pattern';
import { genInterfaces } from '../fwrd/mod.ts';

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

const handle = (s: State, e: Event) =>
  Promise.resolve(
    match(e)
      .with(Events.startPending, () => s == State.entered ? State.pending : s)
      .with(Events.markDone, () => s == State.pending ? State.done : s)
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
