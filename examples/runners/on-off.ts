// usage examples

import { delayOff, delayOn, Events, initialForward, State } from '../on-off.ts';

import { Reaction } from '../../machine.ts';

const r: Reaction<State> = {
  [State.on]: {
    entry: (state) => console.log(state, 'reaction for on'),
  },
  [State.off]: {
    entry: (state) => console.log(state, 'reaction for off entry'),
    exit: (state) => console.log(state, 'reaction for off exit'),
  },
};

export async function runner() {
  let { state, forward } = initialForward(State.off, r);

  ({ state, forward } = await forward(delayOn(2)));
  ({ state, forward } = await forward(delayOff(1)));
  ({ state, forward } = await forward(Events.toggle));
}
