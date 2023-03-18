import * as Store from './store.ts';
import { State } from './store.ts';

// NOTE: it's not a real machine but more of inheritance if you will

type Job = () => Promise<void>;
const emptyJob = () => Promise.resolve();

const { createMachine: createStore, setValue, getValue, defineReaction } = Store
  .genStore<Job>(emptyJob);

export { defineReaction, State };

export const createJobStore = (
  reaction: ReturnType<typeof defineReaction> = {},
) => {
  const store = createStore(Store.State.created, { reaction });

  const runNextJob = async () => {
    const { context } = await store(getValue());
    await context();
  };

  const setNextJob = async (job: Job) => await store(setValue(job));

  // This is the API
  return { runNextJob, setNextJob, emptyJob };
};
