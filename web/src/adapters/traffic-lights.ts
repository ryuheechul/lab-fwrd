import { createMachine, defineReaction, State } from '../../lib/examples/traffic-lights';

import { match } from 'ts-pattern';

const toString = (s: State): string =>
  match(s)
    .with(State.green, () => 'green')
    .with(State.yellow, () => 'yellow')
    .with(State.red, () => 'red')
    .run();

export function start(listen: (b: string) => void) {
  const reaction = defineReaction({
    '*': {
      entry: ({ state }) => {
        listen(toString(state));
      },
    },
  });

  const forward = createMachine(State.red, { reaction });

  //TODO: provide functionality
  return async function toggle() {
    // await forward(Events.toggle);
  };
}
