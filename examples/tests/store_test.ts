import { assertEquals } from 'asserts';

import { genStore, State } from '../store.ts';

type NumberContext = { num: number };

const initial = 0;
const arr = [0, 1, 11, 111];
let index = 0;
const { createMachine: createStore, setValue, getValue, defineReaction } =
  genStore<NumberContext>({ num: initial });

// Compact form: name and function
Deno.test('basic store tests', async () => {
  const reaction = defineReaction({
    [State.created]: {
      entry: ({ context }) => {
        assertEquals(initial, context.num);
      },
    },
    [State.accessed]: {
      entry: ({ context }) => {
        assertEquals(arr[index], context.num);
        index++;
      },
    },
    [State.saved]: {
      entry: ({ context }) => {
        assertEquals(arr[index], context.num);
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
});
