import { match } from 'ts-pattern';
import { genAPI, timeout } from '../fwrd/mod.ts';

export enum State {
  started,
  ended,
}

export enum Events {
  wentOff,
}

type Context = {
  ms: number;
};

export type Event = Events;

export const { defineMachine, defineReaction, defineChildren, defineHandle } =
  genAPI<
    State,
    Event,
    Context
  >();

const handle = defineHandle((s: State, e: Event) =>
  match(e)
    .with(Events.wentOff, () => s == State.started ? State.ended : s)
    .run()
);

//NOTE: children doesn't have to use other machine like in this use case
const children = defineChildren({
  [State.started]: async (obtain) => {
    const { context, forward } = obtain();
    await timeout(context.ms);

    forward(Events.wentOff);
  },
});

export const { initialForward, createMachine } = defineMachine({
  defaultContext: { ms: 0 },
  handle,
  children,
});
