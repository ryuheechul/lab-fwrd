type StateToState<S, E> = (s: S, e: E) => Promise<S>;
type ForwardReturn<S, E> = { state: S; forward: Forward<S, E> };

type Forward<S, E> = (e: E, s?: S) => Promise<ForwardReturn<S, E>>;
type FetchForwardState<S, E> = () => ForwardReturn<S, E>;

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

type ForwardFactoryOptions<S extends Keyable, E> = {
  reaction?: Reaction<S, E>;
  children?: Children<S, E>;
  skipInitialReaction?: boolean;
};

const reactOnExit = <S extends Keyable, E>(
  oldS: S,
  newS: S,
  forward: Forward<S, E>,
  reaction: Reaction<S, E>,
) => {
  // reaction is already Reaction<S, E> so this shouldn't be necessary but without this there is a type warning, oh well
  const r: Reaction<S, E> = reaction;

  // skip for now when it's a same state
  if (oldS == newS) return newS; // NOTE: equal check might get more complicated later

  const action = r[oldS]?.exit;
  if (action) action(oldS, forward);

  const actionForAll = r[wildcard]?.exit;
  if (actionForAll) actionForAll(oldS, forward);

  return newS; // to make it chainable
};

const reactOnEntry = <S extends Keyable, E>(
  state: S,
  forward: Forward<S, E>,
  reaction: Reaction<S, E>,
) => {
  // reaction is already Reaction<S, E> so this shouldn't be necessary but without this there is a type warning, oh well
  const r: Reaction<S, E> = reaction;

  const action = r[state]?.entry;
  if (action) action(state, forward);

  const actionForAll = r[wildcard]?.entry;
  if (actionForAll) actionForAll(state, forward);

  return state; // to make it chainable
};

// "FP" style and:
// - still stateful
// - "old state" can be provided instead of remember (via `forward`)
//   - exit reaction will still be fired for the real old state
function genForward<S extends Keyable, E>(
  handle: StateToState<S, E>,
  init?: InjectFetch<S, E>,
) {
  const initialPublicForward = (
    state: S,
    options: ForwardFactoryOptions<S, E> = {},
  ) => {
    const {
      reaction = {},
      children = {},
      skipInitialReaction = false,
    } = options;

    const fetch = () => ({
      state: trackedState,
      forward,
    });

    const handleWithExitReaction = async (
      event: E,
      actualPreviousState: S,
      eitherActualOrRequestedPreviousState: S,
    ) =>
      reactOnExit(
        // should react to the actual previous one on exit,
        // thus `actualPreviousState` not `eitherActualOrRequestedPreviousState`
        actualPreviousState,
        await handle(eitherActualOrRequestedPreviousState, event),
        forward,
        reaction,
      );

    let trackedState = state;

    const genResult = (state: S) => ({
      state: reactOnEntry(
        state,
        forward,
        reaction,
      ),
      forward,
    });

    const forward: Forward<S, E> = async (e: E, s = trackedState) => {
      const newState = await handleWithExitReaction(
        e,
        trackedState,
        s, // "oldState" can be manipulated via user by providing one
      );

      cbChildrenWrapper(newState);

      trackedState = newState;

      return genResult(newState);
    };

    const cbChildrenWrapper = (state: S) =>
      callbackChildren(state, fetch, children);

    if (init) {
      init(fetch);
    }

    cbChildrenWrapper(state);

    return skipInitialReaction ? { state, forward } : genResult(state);
  };

  return initialPublicForward;
}

type InjectFetch<S, E> = (f: FetchForwardState<S, E>) => void;
export const genDefineInit =
  <S extends Keyable, E>() => (init: InjectFetch<S, E>) => init;

function callbackChildren<S extends Keyable, E>(
  state: S,
  fetch: FetchForwardState<S, E>,
  children: Children<S, E> = {},
) {
  const cb = children[state];
  if (cb) {
    cb(fetch);
  }
}

// just to give an illusion of "OOP" style
function genCreateMachine<S extends Keyable, E>(
  handle: StateToState<S, E>,
  init?: InjectFetch<S, E>,
) {
  const factory = genForward(handle, init);

  return (
    state: S,
    options: ForwardFactoryOptions<S, E> = {
      reaction: {},
      children: {},
      skipInitialReaction: false,
    },
  ) => {
    let { forward } = factory(
      state,
      options,
    );

    let trackedState = state;

    const advance = async (e: E, s = trackedState) => {
      const { state: newState, forward: f } = await forward(e, s);

      forward = f;
      trackedState = newState;

      return newState;
    };

    return advance;
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
  createMachine: genCreateMachine<S, E>(handle, init),
  defineReaction: genDefineReaction<S, E>(),
  defineChildren: genDefineChildren<S, E>(),
  // defineFetchHook: genInjectFetch<S, E>(),
});
