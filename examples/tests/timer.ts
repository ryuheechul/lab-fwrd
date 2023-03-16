import { assertEquals } from 'asserts';
import { timeout } from '../../fwrd/mod.ts';
import { createMachine, defineReaction, State } from '../timer.ts';

Deno.test('basic timer test', async () => {
  let count = 0;
  const reaction = defineReaction({
    [State.started]: {
      entry: () => {
        count++;
      },
    },
    [State.ended]: {
      entry: () => {
        count++;

        assertEquals(count, 2);
        // await forward(Events.putBack); // this will make it goes forever
      },
    },
  });

  createMachine(State.started, { reaction, context: { ms: 100 } });
  await timeout(200);
});
