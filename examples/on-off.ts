import { match, P } from 'npm:ts-pattern';
import { genInitialForward, timeout } from '../machine.ts';

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
export type DelayOn = {
  _event: Events.on;
  delay: number; // in sec
};

// helper function to create On event
export const delayOn = (delay: DelayOn['delay'] | typeof P._): DelayOn => ({
  _event: Events.on,
  delay: delay as DelayOn['delay'],
});

// another event with parameter
export type DelayOff = {
  _event: Events.off;
  delay: number; // in sec
};

// helper function to create Off event
export const delayOff = (delay: DelayOff['delay'] | typeof P._): DelayOff => ({
  _event: Events.off,
  delay: delay as DelayOff['delay'],
});

type Event = Events | DelayOn | DelayOff;

const handle = async (s: State, e: Event) =>
  await match(e)
    .with(Events.toggle, () => s == State.off ? State.on : State.off)
    .with(Events.on, () => State.on)
    .with(Events.off, () => State.off)
    .with(delayOn(P.number), async ({ delay }) => {
      await timeout(delay * 1000);
      return State.on;
    })
    .with(delayOff(P.number), async ({ delay }) => {
      await timeout(delay * 1000);
      return State.off;
    })
    .exhaustive();

export const initialForward = genInitialForward<State, Event>(handle);
