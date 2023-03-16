// usage examples

import {
  createMachine,
  defineReaction,
  delayedOff,
  delayedOn,
  Events,
  initialForward,
  State,
} from '../on-off.ts';

import { assertEquals } from 'asserts';

let count = 0;
const aeWrapper = (a: State, b: State) => {
  assertEquals(a, b);
  count++;
};

const reaction = defineReaction({
  [State.on]: {
    entry: ({ state }) => aeWrapper(state, State.on),
  },
  [State.off]: {
    entry: ({ state }) => aeWrapper(state, State.off),
    exit: ({ state }) => aeWrapper(state, State.off),
  },
});

// Compact form: name and function
Deno.test('FP style', async () => {
  let { state, forward } = initialForward(State.off, { reaction });
  aeWrapper(state, State.off);
  //TODO: one day test timing as well
  ({ state, forward } = await forward(delayedOn(1)));
  aeWrapper(state, State.on);
  ({ state, forward } = await forward(delayedOff(1)));
  aeWrapper(state, State.off);
  ({ state, forward } = await forward(Events.toggle));
  aeWrapper(state, State.on);
});

Deno.test('OOP style', async () => {
  let state = State.off;
  const advance = createMachine(state, { reaction });
  ({ state } = await advance(delayedOn(1)));
  aeWrapper(state, State.on);
  ({ state } = await advance(delayedOff(1)));
  aeWrapper(state, State.off);
  ({ state } = await advance(Events.toggle));
  aeWrapper(state, State.on);
});

Deno.test('count', () => {
  assertEquals(count, 19);
});
