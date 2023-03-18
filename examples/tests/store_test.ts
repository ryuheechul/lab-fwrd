import { assertEquals } from 'asserts';
import { genStore, State } from '../store.ts';

Deno.test('gen store "tests"', () => {
  // hover over createMachine to see what types it resolves to
  const { createMachine: _i } = genStore(1);
  const { createMachine: _s } = genStore('string');
  const { createMachine: _n } = genStore(null);
  const { createMachine: _u } = genStore(undefined);
  // unlike the test code above, specifying type like `genStore<number>(1)` is recommended
  // to avoid mistakes of "cognitive" type mismatch
  // for example:
  // ```
  // type MyType = { type: 'my_type', value: number };
  // genStore({type: 'my_type', value: 1}) will not result in genStore<MyType>
  // all though they are identical at the time, changing MyType will not enforce genStore to check that mismatch
  // ```

  // and genStore() with no arg is not possible
});

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
