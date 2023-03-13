import {
  contextPerState,
  createMachine,
  defineReaction,
  State,
} from '../traffic-lights.ts';

export function runner() {
  const reaction = defineReaction({
    '*': {
      exit: (state) => {
        const { name } = contextPerState(state);
        console.log(`exited ${name} - still observing via reaction`);
      },
    },
  });
  // unlike ./on-off.ts, all logic is encapsulated at ../traffic-lights.ts
  // so it's up to the creator of machine to decide whether to give enforcement or flexibility
  createMachine(State.green, { reaction });
}
