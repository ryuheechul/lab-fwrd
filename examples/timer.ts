import { match } from 'ts-pattern';
import { genInterfaces } from '../fwrd/mod.ts';

export enum State {
  started,
  ended,
}

// simple events
export enum Events {
  wentOff,
}

export type Event = Events;

const handle = (s: State, e: Event) =>
  Promise.resolve(
    match(e)
      .with(Events.wentOff, () => s == State.started ? State.ended : s)
      .run(),
  );

export const { initialForward, createMachine, defineReaction } = genInterfaces<
  State,
  Event
>(
  handle,
);
