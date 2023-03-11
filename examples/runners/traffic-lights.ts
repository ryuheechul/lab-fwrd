import { startTrafficLights, State } from '../traffic-lights.ts';

export function runner() {
  // unlike ./on-off.ts, all logic is encapsulated at ../traffic-lights.ts
  // so it's up to the creator of machine to decide whether to give enforcement or flexibility
  startTrafficLights(State.green);
}
