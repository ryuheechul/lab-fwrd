import { assertEquals } from 'asserts';

import { genStore, State } from '../store.ts';

const initial = 0;
const arr = [0, 1, 11, 111];
let index = 0;
const { createMachine: createStore, setValue, getValue, defineReaction } =
  genStore<number>(initial);

// Compact form: name and function
Deno.test('basic store tests', async () => {
  const reaction = defineReaction({
    [State.created]: {
      entry: ({ context }) => {
        assertEquals(initial, context);
      },
    },
    [State.accessed]: {
      entry: ({ context }) => {
        assertEquals(arr[index], context);
        index++;
      },
    },
    [State.saved]: {
      entry: ({ context }) => {
        assertEquals(arr[index], context);
      },
    },
  });

  const store = createStore(State.created, { reaction });

  await store(getValue());
  await store(setValue(1));
  await store(getValue());
  await store(setValue(11));
  await store(getValue());
  await store(setValue(111));
  await store(getValue());
});
