import * as Store from './store.ts';
import { State } from './store.ts';

// NOTE: it's not a real machine but more of inheritance if you will

type Job = () => Promise<void>;
type JobContext = { run: Job };
const emptyJob: Job = () => Promise.resolve();
const defaultJobContext = { run: emptyJob };

const { createMachine: createStore, setValue, getValue, defineReaction } = Store
  .genStore<
    JobContext
  >(defaultJobContext);

export { defineReaction, State };

export const createJobStore = (
  reaction: ReturnType<typeof defineReaction> = {},
) => {
  const store = createStore(Store.State.created, { reaction });

  const runNextJob = async () => {
    const { context } = await store(getValue());
    await context.run();
  };

  const setNextJob = async (run: Job) => await store(setValue({ run }));

  // This is the API
  return { runNextJob, setNextJob, emptyJob };
};
