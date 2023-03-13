// usage examples

import {
  delayedOff,
  delayedOn,
  Event,
  Events,
  initialForward,
  initialForwarder,
  State,
} from '../on-off.ts';

import { Reaction } from '../../machine.ts';

const reaction: Reaction<State, Event> = {
  [State.on]: {
    entry: (state) => console.log(`[entry reaction] for ${state}`),
  },
  [State.off]: {
    entry: (state) => console.log(`[entry reaction] for ${state}`),
    exit: (state) => console.log(`[exit reaction] for ${state}`),
  },
};

async function runnerInFPStyle() {
  console.log('trying FP style');
  let { state, forward } = initialForward(State.off, { reaction });

  console.log(`forward from ${state} with delayedOn(2)`);
  ({ state, forward } = await forward(delayedOn(2)));
  console.log(`forward from ${state} with delayedOff(1)`);
  ({ state, forward } = await forward(delayedOff(1)));
  console.log(`forward from ${state} with toggle`);
  ({ state, forward } = await forward(Events.toggle));
  console.log(`finalState: ${state}`);
}

async function runnerInOOPStyle() {
  console.log('trying OOP style');
  let state = State.off;
  const forward = initialForwarder(state, { reaction });

  console.log(`forward from ${state} with delayedOn(2)`);
  state = await forward(delayedOn(2));
  console.log(`forward from ${state} with delayedOff(1)`);
  state = await forward(delayedOff(1));
  console.log(`forward from ${state} with toggle`);
  state = await forward(Events.toggle);
  console.log(`finalState: ${state}`);
}

export async function runner() {
  await runnerInFPStyle();
  await runnerInOOPStyle();
}
