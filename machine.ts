import { match, P } from "npm:ts-pattern";

// simple events
export enum Events {
  toggle,
  off,
  on,
}

// an event with parameter
export type DelayOn = {
  _event: Events.on;
  delay: number; // in sec
};

// helper function to create On event
export const delayOn = (delay: DelayOn["delay"] | typeof P._): On => ({
  _event: Events.on,
  delay: delay as On["delay"],
});

export type DelayOff = {
  _event: Events.off;
  delay: number; // in sec
};

// helper function to create Off event
export const delayOff = (delay: DelayOff["delay"] | typeof P._): Off => ({
  _event: Events.off,
  delay: delay as Off["delay"],
});

type Event = Events | DelayOn | DelayOff;

export enum State {
  // pending,
  off,
  on,
}

type ReactionHandler = (state: State) => void;

type ReactionBundle = {
  entry?: ReactionHandler;
  exit?: ReactionHandler;
};

export type Reaction = Partial<Record<State, ReactionBundle>>;

interface EventToState {
  (s: State, e: Event): Promise<State>;
}

function timeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const handle: EventToState = async (s: State, e: Event) =>
  await match(e)
    .with(Events.toggle, () => s == State.off ? State.on : State.off)
    .with(Events.on, () => State.on)
    .with(Events.off, () => State.off)
    .with(delayOn(P.number), async ({ delay }) => {
      await timeout(delay * 1000);
      return State.on;
    })
    .with(delayOff(P.number), async ({ delay }) => {
      await timeout(delay * 1000);
      return State.off;
    })
    .exhaustive();

const reactOnExit = (oldS: State, newS: State, r: Reaction) => {
  // NOTE: equal check might get more complicated later
  if (oldS == newS) return newS;

  const action = r[oldS]?.exit;
  if (action) {
    action(oldS);
  }
  return newS; // to make it chainable
};

const reactOnEntry = (state: State, r: Reaction) => {
  const action = r[state]?.entry;
  if (action) {
    action(state);
  }
  return state; // to make it chainable
};

const forward = (state: State, reaction: Reaction = {}) => ({
  state: reactOnEntry(state, reaction),
  forward: async (event: Event) =>
    forward(
      reactOnExit(
        state,
        await handle(state, event),
        reaction,
      ),
      reaction,
    ),
});

export const initialForward = forward;
