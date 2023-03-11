// usage examples

import {
  delayOff,
  delayOn,
  Events,
  initialForward,
  Reaction,
  State,
} from "./machine.ts";

const r: Reaction = {
  [State.on]: {
    entry: (state) => console.log(state, "reaction for on"),
  },
  [State.off]: {
    entry: (state) => console.log(state, "reaction for off entry"),
    exit: (state) => console.log(state, "reaction for off exit"),
  },
};

let { state, forward } = initialForward(State.off, r);

({ state, forward } = await forward(delayOn(2)));
({ state, forward } = await forward(delayOff(1)));
({ state, forward } = await forward(Events.toggle));
