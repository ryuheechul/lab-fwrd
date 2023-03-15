import { timeout } from '../../fwrd/mod.ts';
import {
  createMachine,
  defineReaction,
  Events,
  State,
} from '../pomodoro-timer.ts';

export async function runner() {
  const reaction = defineReaction({
    '*': {
      entry: ({ context, state }) => {
        console.log(`Pomodoro is ${context[state].name}!`);
      },
    },
  });

  const advance = createMachine(State.started, { reaction });

  await timeout(5000);
  await advance(Events.stop);
}
