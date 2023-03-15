import { match, P } from 'ts-pattern';
import { genAPI, noContext, timeout } from '../fwrd/mod.ts';

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

// helper function to create on event
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

// helper function to create off event
export const delayedOff = (
  delay: DelayedOff['delay'] | typeof P._,
): DelayedOff => ({
  _event: Events.off,
  delay: delay as DelayedOff['delay'],
});

export type DelayedToggle = {
  _event: Events.toggle;
  delay: number; // in sec
};

// helper function to create toggle event
export const delayedToggle = (
  delay: DelayedToggle['delay'] | typeof P._,
): DelayedToggle => ({
  _event: Events.toggle,
  delay: delay as DelayedToggle['delay'],
});

export type Event = Events | DelayedOn | DelayedOff | DelayedToggle;

const toggle = (s: State) => s == State.off ? State.on : State.off;

const handle = async (s: State, e: Event) =>
  await match(e)
    .with(Events.toggle, () => toggle(s))
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
    .with(delayedToggle(P.number), async ({ delay }) => {
      await timeout(delay * 1000);
      return toggle(s);
    })
    .run();

export const toBoolean = (s: State) => (s == State.off ? false : true);

export const { defineReaction, defineMachine } = genAPI<
  State,
  Event
>();

export const { initialForward, createMachine } = defineMachine({
  ...noContext,
  handle,
});
