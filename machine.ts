type ReactionHandler<S> = (state: S) => void;

type ReactionBundle<S> = {
  entry?: ReactionHandler<S>;
  exit?: ReactionHandler<S>;
};

type Keyable = string | number | symbol;

export type Reaction<S extends Keyable> = Partial<Record<S, ReactionBundle<S>>>;

export function timeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const reactOnExit = <S extends Keyable, R extends Reaction<S>>(
  oldS: S,
  newS: S,
  r: R,
) => {
  // NOTE: equal check might get more complicated later
  if (oldS == newS) return newS;

  const action = r[oldS]?.exit;
  if (action) {
    action(oldS);
  }
  return newS; // to make it chainable
};

const reactOnEntry = <S extends Keyable, R extends Reaction<S>>(
  state: S,
  r: R,
) => {
  const action = r[state]?.entry;
  if (action) {
    action(state);
  }
  return state; // to make it chainable
};

type StateToState<S, E> = (s: S, e: E) => Promise<S>;

function genForward<S extends Keyable, E>(
  handle: StateToState<S, E>,
) {
  const forward = (state: S, reaction: Reaction<S> = {}) => ({
    state: reactOnEntry(state, reaction),
    forward: async (event: E) =>
      forward(
        reactOnExit(
          state,
          await handle(state, event),
          reaction,
        ),
        reaction,
      ),
  });

  return forward;
}

export const genInitialForward = genForward;
