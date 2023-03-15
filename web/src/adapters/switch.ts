import { createMachine, defineReaction, Events, State, toBoolean } from '../../lib/examples/on-off';

export function start(listen: (b: boolean) => void) {
  const reaction = defineReaction({
    '*': {
      entry: ({ state }) => {
        listen(toBoolean(state));
      },
    },
  });

  const advance = createMachine(State.off, { reaction });

  return async function toggle() {
    await advance(Events.toggle);
  };
}
