type StateToState<S, E> = (s: S, e: E) => Promise<S>;
type ForwardReturn<S, E> = { state: S; forward: Forward<S, E> };

type Forward<S, E> = (e: E, s?: S) => Promise<ForwardReturn<S, E>>;
type ForwardStateOnly<S, E> = (e: E, s?: S) => Promise<S>;
type FetchForwardState<S, E> = {
  state: S;
  forward: ForwardStateOnly<S, E>;
};

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

export type Children<S extends Keyable, E> = Partial<
  Record<S, InjectFetch<S, E>>
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
  const forward: Forward<S, E> = genForward<S, E>(handle)(oldS, {
    reaction: r,
    skipInitialReaction: true,
  })
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
  children?: Children<S, E>;
  skipInitialReaction?: boolean;
};

// "FP" style and:
// - still stateful
// - "old state" can be provided instead of remember (via `forward`)
//   - exit reaction will still be fired for the real old state
function genForward<S extends Keyable, E>(
  handle: StateToState<S, E>,
) {
  const forwardFactory = (
    state: S,
    options: ForwardFactoryOptions<S, E> = {},
  ) => {
    const {
      reaction = {},
      skipInitialReaction = false,
    } = options;

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

type InjectFetch<S, E> = (f: () => FetchForwardState<S, E>) => void;
export const genDefineInit =
  <S extends Keyable, E>() => (init: InjectFetch<S, E>) => init;

function callbackChildren<S extends Keyable, E>(
  state: S,
  fetch: () => FetchForwardState<S, E>,
  children: Children<S, E> = {},
) {
  const cb = children[state];
  if (cb) {
    cb(fetch);
  }
}

// "OOP" style
function createMachine<S extends Keyable, E>(
  handle: StateToState<S, E>,
  init?: InjectFetch<S, E>,
) {
  const factory = genForward(handle);

  return (
    state: S,
    options: ForwardFactoryOptions<S, E> = {
      reaction: {},
      children: {},
      skipInitialReaction: false,
    },
  ) => {
    let { forward: privateForward } = factory(
      state,
      options,
    );

    let trackedState = state;

    const forward = async (e: E, s = trackedState) => {
      const { state: newState, forward: f } = await privateForward(e, s);

      cbChildrenWrapper(newState);

      privateForward = f;
      trackedState = newState;

      return newState;
    };

    const fetch = () => ({
      state: trackedState,
      forward,
    });

    if (init) {
      init(fetch);
    }

    const cbChildrenWrapper = (state: S) =>
      callbackChildren(state, fetch, options.children);

    cbChildrenWrapper(state);

    return forward;
  };
}

const genDefineReaction =
  <S extends Keyable, E>() => (reaction: Reaction<S, E>) => reaction;

const genDefineChildren =
  <S extends Keyable, E>() => (children: Children<S, E>) => children;

// const genInjectFetch =
//   <S extends Keyable, E>() => (injectFetch: InjectFetch<S, E>) => injectFetch;

// use like below to expose interface to be used
// `export const { ... } = genInterfaces<S..., E...>`
export const genInterfaces = <S extends Keyable, E>(
  handle: StateToState<S, E>,
  init?: InjectFetch<S, E>,
) => ({
  initialForward: genForward<S, E>(handle),
  createMachine: createMachine<S, E>(handle, init),
  defineReaction: genDefineReaction<S, E>(),
  defineChildren: genDefineChildren<S, E>(),
  // defineFetchHook: genInjectFetch<S, E>(),
});
