import { children, createMachine, defineReaction, State } from '../delay.ts';

export function runner() {
  const reaction = defineReaction({
    [State.delayed]: {
      entry: () => {
        console.log('delay machine - delayed');
      },
    },
    [State.caughtUp]: {
      entry: (_state, _forward) => {
        console.log('delay machine - caught up');

        // await forward(Events.putBack); // this will make it goes forever
      },
    },
  });

  //TODO: provide a ms to customize delay by user
  createMachine(State.delayed, { reaction, children });
}
