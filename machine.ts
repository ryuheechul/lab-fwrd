type StateToState<S, E> = (s: S, e: E) => Promise<S>;
type ForwardReturn<S, E> = { state: S; forward: Forward<S, E> };

type Forward<S, E> = (e: E, s?: S) => Promise<ForwardReturn<S, E>>;

type ReactionHandler<S, E> = (s: S, f: Forward<S, E>) => void;

type ReactionBundle<S, E> = {
  entry?: ReactionHandler<S, E>;
  exit?: ReactionHandler<S, E>;
};

type Keyable = string | number | symbol;

type Wildcard = '*';
const wildcard: Wildcard = '*' as const;

export type Reaction<S extends Keyable, E> =
  & Partial<
    Record<S, ReactionBundle<S, E>>
  >
  & Partial<
    Record<Wildcard, ReactionBundle<S, E>>
  >;

export function timeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const reactOnExit = <S extends Keyable, R extends Reaction<S, E>, E>(
  skipInitialReaction: boolean,
  oldS: S,
  newS: S,
  r: R,
  handle: StateToState<S, E>,
) => {
  if (skipInitialReaction) return newS;
  // skip for now when it's a same state
  if (oldS == newS) return newS; // NOTE: equal check might get more complicated later

  // with generic signature upfront but same thing as the one in reactOnEntry
  const forward: Forward<S, E> =
    genForward<S, E>(handle)(oldS, { reaction: r, skipInitialReaction: true })
      .forward;

  const action = r[oldS]?.exit;
  if (action) action(oldS, forward);

  const actionForAll = r[wildcard]?.exit;
  if (actionForAll) actionForAll(oldS, forward);

  return newS; // to make it chainable
};

const reactOnEntry = <S extends Keyable, R extends Reaction<S, E>, E>(
  skipInitialReaction: boolean,
  state: S,
  r: R,
  handle: StateToState<S, E>,
) => {
  if (skipInitialReaction) return state;

  // without generic signature up front but same thing as the one in reactOnExit
  const { forward } = genForward<S, E>(handle)(state, {
    reaction: r,
    skipInitialReaction: true,
  });

  const action = r[state]?.entry;
  if (action) action(state, forward);

  const actionForAll = r[wildcard]?.entry;
  if (actionForAll) actionForAll(state, forward);

  return state; // to make it chainable
};

type ForwardFactoryOptions<S extends Keyable, E> = {
  reaction?: Reaction<S, E>;
  skipInitialReaction?: boolean;
};

// "FP" style (but still stateful unless optional state is provided to `forward`)
function genForward<S extends Keyable, E>(
  handle: StateToState<S, E>,
) {
  const forwardFactory = (
    state: S,
    options: ForwardFactoryOptions<S, E> = {
      reaction: {},
      skipInitialReaction: false,
    },
  ) => {
    const { reaction = {}, skipInitialReaction = false } = options;

    return {
      state: reactOnEntry(skipInitialReaction, state, reaction, handle),
      // "oldState" can be manipulated via user by providing one
      forward: async (
        event: E,
        eitherActualOrRequestedPreviousState: S = state,
      ) =>
        forwardFactory(
          // this will happen before reactOnEntry on any state
          // even though it doesn't look that way intuitively
          reactOnExit(
            skipInitialReaction,
            state, // should react to the actual previous one on exit, thus `state` not `eitherActualOrRequestedPreviousState`
            await handle(eitherActualOrRequestedPreviousState, event),
            reaction,
            handle,
          ),
          {
            reaction,
          },
        ),
    };
  };

  return forwardFactory;
}

// "OOP" style
function genForwarder<S extends Keyable, E>(
  handle: StateToState<S, E>,
) {
  const factory = genForward(handle);

  return (
    state: S,
    options: ForwardFactoryOptions<S, E> = {
      reaction: {},
      skipInitialReaction: false,
    },
  ) => {
    let { forward: privateForward } = factory(
      state,
      options,
    );

    const forward = async (e: E) => {
      const { state: s, forward: f } = await privateForward(e);
      privateForward = f;

      return s;
    };

    return forward;
  };
}

const genDefineReaction =
  <S extends Keyable, E>() => (reaction: Reaction<S, E>) => reaction;

// use like below to expose interface to be used
// `export const { ... } = genInterfaces<S..., E...>`
export const genInterfaces = <S extends Keyable, E>(
  handle: StateToState<S, E>,
) => ({
  initialForward: genForward<S, E>(handle),
  initialForwarder: genForwarder<S, E>(handle),
  defineReaction: genDefineReaction<S, E>(),
});
