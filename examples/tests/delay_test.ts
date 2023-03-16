import { createMachine, defineReaction, State } from '../delay.ts';
import { assertEquals } from 'asserts';
import { timeout } from '../../fwrd/mod.ts';

Deno.test('basic delay test', async () => {
  let count = 0;
  const reaction = defineReaction({
    [State.delayed]: {
      entry: () => {
        count++;
      },
    },
    [State.caughtUp]: {
      entry: () => {
        count++;
        assertEquals(count, 2);
      },
    },
  });

  createMachine(State.delayed, { reaction, context: { delay: 100 } });

  await timeout(200);
});
