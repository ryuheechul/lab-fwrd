import { createJobStore, defineReaction, State } from '../job.ts';

export async function runner() {
  const reaction = defineReaction({
    [State.created]: {
      entry: ({ context }) => {
        console.log(`job store created - ${context.run.toString()}`);
      },
    },
    [State.accessed]: {
      entry: ({ context }) => {
        console.log(`job store accessed - ${context.run.toString()}`);
      },
    },
    [State.saved]: {
      entry: ({ context }) => {
        console.log(`job store saved - ${context.run.toString()}`);
      },
    },
  });

  const { runNextJob, setNextJob, emptyJob } = createJobStore(reaction);

  await setNextJob(() => Promise.resolve(console.log('this job')));
  await setNextJob(() => Promise.resolve(console.log('that job')));
  await setNextJob(() => Promise.resolve(console.log('cool job')));
  await runNextJob();
  await setNextJob(emptyJob);
}
