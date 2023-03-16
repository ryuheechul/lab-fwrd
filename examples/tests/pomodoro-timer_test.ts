import { assertEquals } from 'asserts';
import { timeout } from '../../fwrd/mod.ts';
import {
  createMachine,
  defineContext,
  defineReaction,
  Events,
  info,
  State,
} from '../pomodoro-timer.ts';

const result: string[] = [];

const expected = [
  'Running',
  'On a break',
  'Running',
  'Stopped',
];

const context = defineContext({
  [State.started]: info('Running', 1),
  [State.onBreak]: info('On a break', 0.5),
  [State.stopped]: info('Stopped', 0),
});

Deno.test('warm up', async () => {
  const reaction = defineReaction({
    '*': {
      entry: ({ context, state }) => {
        result.push(context[state].name);
      },
    },
  });

  const advance = createMachine(State.started, { reaction, context });

  await timeout(2000);
  await advance(Events.stop);
  await timeout(1000); // to wait for the timer to go off - other wise this will be reported as memory leak
  assertEquals(1, 1);
});

Deno.test('now compare', () => {
  assertEquals(expected, result);
});
