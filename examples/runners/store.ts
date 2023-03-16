import { genStore, State } from '../store.ts';

type NumberContext = { num: number };

const { createMachine: createStore, setValue, getValue, defineReaction } =
  genStore<NumberContext>({ num: 0 });

export async function runner() {
  const reaction = defineReaction({
    [State.created]: {
      entry: ({ context }) => {
        console.log(`store created - ${JSON.stringify(context)}`);
      },
    },
    [State.accessed]: {
      entry: ({ context }) => {
        console.log(`store accessed - ${JSON.stringify(context)}`);
      },
    },
    [State.saved]: {
      entry: ({ context }) => {
        console.log(`store saved - ${JSON.stringify(context)}`);
      },
    },
  });

  const store = createStore(State.created, { reaction });

  await store(getValue());
  await store(setValue({ num: 1 }));
  await store(getValue());
  await store(setValue({ num: 11 }));
  await store(getValue());
  await store(setValue({ num: 111 }));
  await store(getValue());
}
