import { createMachine, defineReaction, State } from '../timer.ts';

export function runner() {
  const reaction = defineReaction({
    [State.started]: {
      entry: ({ context }) => {
        console.log(`timer - started with ${context.ms}`);
      },
    },
    [State.ended]: {
      entry: () => {
        console.log('timer - ended');

        // await forward(Events.putBack); // this will make it goes forever
      },
    },
  });

  createMachine(State.started, { reaction, context: { ms: 5000 } });
}
