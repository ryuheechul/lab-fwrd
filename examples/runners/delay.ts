import { createMachine, defineReaction, State } from '../delay.ts';

export function runner() {
  const reaction = defineReaction({
    [State.delayed]: {
      entry: () => {
        console.log('delay machine - delayed');
      },
    },
    [State.caughtUp]: {
      entry: () => {
        console.log('delay machine - caught up');

        // await forward(Events.putBack); // this will make it goes forever
      },
    },
  });

  createMachine(State.delayed, { reaction, context: { delay: 2000 } });
}
