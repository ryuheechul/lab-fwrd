import { genAPI } from '../fwrd/mod.ts';
import * as Timer from './timer.ts';
import { createJobStore } from './job.ts';

export enum State {
  stopped,
  started,
  onBreak,
}

export enum Events {
  start,
  haveBreak,
  stop,
}

export type Event = Events;

type Info = {
  name: string;
  delay: number;
};

const msInSec = 1000;
export const info = (name: string, sec: number): Info => ({
  name,
  delay: sec * msInSec,
});

type Context = Record<State, Info>;

export const {
  defineMachine,
  defineReaction,
  defineChildren,
  defineHandle,
  defineContext,
} = genAPI<
  State,
  Event,
  Context
>();

const initialContext = defineContext({
  [State.started]: info('Running', 3),
  [State.onBreak]: info('On a break', 1),
  [State.stopped]: info('Stopped', 0),
});

const handle = defineHandle(({ event }) => ({
  [Events.start]: State.started,
  [Events.stop]: State.stopped,
  [Events.haveBreak]: State.onBreak,
}[event]));

const children = defineChildren(() => {
  const { runNextJob, setNextJob, emptyJob } = createJobStore();

  return {
    [State.stopped]: async () => {
      // basically cancel the job
      await setNextJob(emptyJob);
    },
    [State.started]: async (obtain) => {
      const { context, state } = obtain();
      const { delay } = context[state];

      await setNextJob(async () => {
        const { forward } = obtain();
        await forward(Events.haveBreak);
      });

      runTimer(delay, runNextJob);
    },
    [State.onBreak]: async (obtain) => {
      const { context, state } = obtain();
      const { delay } = context[state];

      await setNextJob(
        async () => {
          const { forward } = obtain();
          await forward(Events.start);
        },
      );

      runTimer(delay, runNextJob);
    },
  };
});

export const {
  initialForward,
  createMachine,
} = defineMachine({ initialContext, handle, children });

type GenericCallback = () => void;

function runTimer(ms: number, done: GenericCallback) {
  const reaction = Timer.defineReaction({
    [Timer.State.ended]: {
      'entry': () => {
        done();
      },
    },
  });

  Timer.createMachine(Timer.State.started, { reaction, context: { ms } });
}
