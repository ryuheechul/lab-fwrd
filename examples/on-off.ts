import { match, P } from 'npm:ts-pattern';
import { genInterfaces, timeout } from '../fwrd/mod.ts';

export enum State {
  off,
  on,
}

// simple events
export enum Events {
  toggle,
  off,
  on,
}

// an event with parameter
export type DelayedOn = {
  _event: Events.on;
  delay: number; // in sec
};

// helper function to create On event
export const delayedOn = (
  delay: DelayedOn['delay'] | typeof P._,
): DelayedOn => ({
  _event: Events.on,
  delay: delay as DelayedOn['delay'],
});

// another event with parameter
export type DelayedOff = {
  _event: Events.off;
  delay: number; // in sec
};

// helper function to create Off event
export const delayedOff = (
  delay: DelayedOff['delay'] | typeof P._,
): DelayedOff => ({
  _event: Events.off,
  delay: delay as DelayedOff['delay'],
});

export type Event = Events | DelayedOn | DelayedOff;

const handle = async (s: State, e: Event) =>
  await match(e)
    .with(Events.toggle, () => s == State.off ? State.on : State.off)
    .with(Events.on, () => State.on)
    .with(Events.off, () => State.off)
    .with(delayedOn(P.number), async ({ delay }) => {
      await timeout(delay * 1000);
      return State.on;
    })
    .with(delayedOff(P.number), async ({ delay }) => {
      await timeout(delay * 1000);
      return State.off;
    })
    .exhaustive();

export const { initialForward, initialForwarder, defineReaction } =
  genInterfaces<
    State,
    Event
  >(handle);
