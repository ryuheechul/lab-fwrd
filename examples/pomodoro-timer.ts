import { genAPI } from '../fwrd/mod.ts';
import * as Timer from './timer.ts';

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
const info = (name: string, sec: number): Info => ({
  name,
  delay: sec * msInSec,
});

type Context = Record<State, Info>;

type Job = () => Promise<void>;
const emptyJob: Job = () => Promise.resolve();

const defaultContext = {
  [State.started]: info('Running', 3),
  [State.onBreak]: info('On a break', 1),
  [State.stopped]: info('Stopped', 0),
};

export const {
  defineMachine,
  defineReaction,
  defineChildren,
  defineHandle,
} = genAPI<
  State,
  Event,
  Context
>();

const handle = defineHandle((_s: State, e: Event) => ({
  [Events.start]: State.started,
  [Events.stop]: State.stopped,
  [Events.haveBreak]: State.onBreak,
}[e]));

const children = defineChildren(() => {
  let nextJob = emptyJob;

  return {
    [State.stopped]: () => {
      // basically cancel the job
      nextJob = emptyJob;
    },
    [State.started]: (obtain) => {
      const { context, state } = obtain();
      const { delay } = context[state];

      nextJob = async () => {
        const { forward } = obtain();
        await forward(Events.haveBreak);
      };

      runTimer(delay, async () => await nextJob());
    },
    [State.onBreak]: (obtain) => {
      const { context, state } = obtain();
      const { delay } = context[state];

      nextJob = async () => {
        const { forward } = obtain();
        await forward(Events.start);
      };

      runTimer(delay, async () => await nextJob());
    },
  };
});

export const {
  initialForward,
  createMachine,
} = defineMachine({ defaultContext, handle, children });

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
