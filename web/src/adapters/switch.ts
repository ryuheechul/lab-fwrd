import { createMachine, defineReaction, Events, State, toBoolean } from '../../lib/examples/on-off';

export function start(listen: (b: boolean) => void, initialState = false) {
  const reaction = defineReaction({
    '*': {
      entry: ({ state }) => {
        listen(toBoolean(state));
      },
    },
  });

  const advance = createMachine(initialState ? State.on : State.off, { reaction });

  return async function toggle() {
    await advance(Events.toggle);
  };
}
