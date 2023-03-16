import { assertEquals } from 'asserts';

import { createJobStore, defineReaction, State } from '../job.ts';

const jobNames = ['this job', 'that job', 'cool job'];
const toString = (content: string) => `()=>Promise.resolve(${content})`;
const consoleLog = (str: string) => `console.log('${str}')`;
const emptyJobStr = '()=>Promise.resolve()';
let index = 0;

let shouldBe9 = 0;

const changeAboveTo9 = async () => {
  shouldBe9 = 9;
  return await Promise.resolve();
};

const runChangeAboveTo9 = async () => await changeAboveTo9();

const strForAbove = 'async ()=>await changeAboveTo9()';

// Compact form: name and function
Deno.test('hello world #1', async () => {
  const reaction = defineReaction({
    [State.created]: {
      entry: ({ context }) => {
        assertEquals(context.run.toString(), emptyJobStr);
      },
    },
    [State.accessed]: {
      entry: ({ context }) => {
        assertEquals(
          context.run.toString(),
          index > 3 ? strForAbove : toString(consoleLog(jobNames[index - 1])),
        );
      },
    },
    [State.saved]: {
      entry: ({ context }) => {
        assertEquals(
          context.run.toString(),
          index > 3
            ? strForAbove
            : (index < 3 ? toString(consoleLog(jobNames[index])) : emptyJobStr),
        );
        index++;
      },
    },
  });

  const { runNextJob, setNextJob, emptyJob } = createJobStore(reaction);

  await setNextJob(() => Promise.resolve(console.log('this job')));
  await setNextJob(() => Promise.resolve(console.log('that job')));
  await setNextJob(() => Promise.resolve(console.log('cool job')));
  await runNextJob();
  await setNextJob(emptyJob);
  await setNextJob(runChangeAboveTo9);
  await runNextJob();

  assertEquals(9, shouldBe9);
});
