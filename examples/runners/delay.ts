import { createMachine, defineReaction, State } from '../delay.ts';

export function runner() {
  const reaction = defineReaction({
    [State.caughtUp]: {
      entry: () => {
        console.log(`caught up`);
      },
    },
  });
  createMachine(State.delayed, { reaction });
}
