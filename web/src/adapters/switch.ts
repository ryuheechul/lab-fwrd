import { toBoolean, defineReaction, Events, createMachine, State } from '../../lib/examples/on-off';

export function start(listen: (b: boolean) => void) {
  const reaction = defineReaction({
    '*': {
      entry: (state: State) => {
        listen(toBoolean(state));
      },
    },
  });

  const forward = createMachine(State.off, { reaction });

  return async function toggle() {
    await forward(Events.toggle);
  };
}
