type HandleParams<S, E, C> = {
  state: S;
  event: E;
  updateContext?: (c: C) => void;
};
type Handle<S, E, C> = (p: HandleParams<S, E, C>) => Promise<S>;
type HandleBare<S, E, C> = (p: HandleParams<S, E, C>) => S;
type HandleAmbiguous<S, E, C> =
  | Handle<S, E, C>
  | HandleBare<S, E, C>;

type ForwardReturn<S, E, C> = {
  state: S;
  forward: Forward<S, E, C>;
  context: C;
};

type Forward<S, E, C> = (e: E, s?: S) => Promise<ForwardReturn<S, E, C>>;

type ObtainKit<S, E, C> = { state: S; forward: Forward<S, E, C>; context: C };
type Obtain<S, E, C> = () => ObtainKit<S, E, C>;
type ObtainHook<S, E, C> = (o: Obtain<S, E, C>) => void;

type ReactionHandler<S, E, C> = (p: ObtainKit<S, E, C>) => void;

type ContextMachine<S extends Keyable, E, C> = {
  handle: Handle<S, E, C>;
  children?: ChildrenAmbiguous<S, E, C>;
  defaultContext: C;
};

type Machine<S extends Keyable, E, C> = C extends null
  ? Omit<ContextMachine<S, E, C>, 'defaultContext'>
  : ContextMachine<S, E, C>;

type ReactionBundle<S, E, C> = {
  entry?: ReactionHandler<S, E, C>;
  exit?: ReactionHandler<S, E, C>;
};

type Keyable = string | number | symbol;

type Wildcard = '*';
const wildcard: Wildcard = '*' as const;

const bareContext = null;

export type Reaction<S extends Keyable, E, C> =
  & Partial<
    Record<S, ReactionBundle<S, E, C>>
  >
  & Partial<
    Record<Wildcard, ReactionBundle<S, E, C>>
  >;

export type Children<S extends Keyable, E, C> = Partial<
  Record<S, ObtainHook<S, E, C>>
>;

export type ChildrenWithOnce<S extends Keyable, E, C> = (
  o: Obtain<S, E, C>,
) => Children<S, E, C>;

export type ChildrenAmbiguous<S extends Keyable, E, C> =
  | Children<S, E, C>
  | ChildrenWithOnce<S, E, C>;

export function timeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ForwardFactoryOptions<S extends Keyable, E, C> = {
  init?: ObtainHook<S, E, C>;
  context?: C;
  reaction?: Reaction<S, E, C>;
  skipInitialReaction?: boolean;
};

const reactOnExit = <S extends Keyable, E, C>(
  oldS: S,
  newS: S,
  obtain: Obtain<S, E, C>,
  reaction: Reaction<S, E, C>,
) => {
  // reaction is already Reaction<S, E> so this shouldn't be necessary but without this there is a type warning, oh well
  const r: Reaction<S, E, C> = reaction;

  // skip for now when it's a same state
  if (oldS == newS) return newS; // NOTE: equal check might get more complicated later

  // TODO: do I need to add `oldS` and `state` (from `obtain`) to be same even though they should be?
  const action = r[oldS]?.exit;
  if (action) action(obtain());

  const actionForAll = r[wildcard]?.exit;
  if (actionForAll) actionForAll(obtain());

  return newS; // to make it chainable
};

const reactOnEntry = <S extends Keyable, E, C>(
  state: S,
  obtain: Obtain<S, E, C>,
  reaction: Reaction<S, E, C>,
) => {
  // reaction is already Reaction<S, E> so this shouldn't be necessary but without this there is a type warning, oh well
  const r: Reaction<S, E, C> = reaction;

  const action = r[state]?.entry;
  if (action) action(obtain());

  const actionForAll = r[wildcard]?.entry;
  if (actionForAll) actionForAll(obtain());

  return state; // to make it chainable
};

// "FP" style and:
// - still stateful
// - "old state" can be provided instead of remember (via `forward`)
//   - exit reaction will still be fired for the real old state
// - optionally expose `handle` if to provide a pure functional calculation based on the previous state and an event
function genForward<S extends Keyable, E, C>(
  defaultContext: C,
  handle: Handle<S, E, C>,
  adaptChildren: ChildrenWithOnce<S, E, C> = () => ({}),
) {
  const initialPublicForward = (
    state: S,
    options: ForwardFactoryOptions<S, E, C> = {},
  ) => {
    const {
      reaction = {},
      skipInitialReaction = false,
      context = defaultContext,
      init,
    } = options;

    let trackedState = state;
    let trackedContext = context;

    const obtain = () => ({
      state: trackedState,
      forward,
      context: trackedContext,
    });

    const updateContext = (c: C) => {
      trackedContext = c;
    };

    const handleWithExitReaction = async (
      event: E,
      actualPreviousState: S,
      eitherActualOrRequestedPreviousState: S,
    ) =>
      reactOnExit(
        // should react to the actual previous one on exit,
        // thus `actualPreviousState` not `eitherActualOrRequestedPreviousState`
        actualPreviousState,
        await handle({
          state: eitherActualOrRequestedPreviousState,
          event,
          updateContext,
        }),
        obtain,
        reaction,
      );

    const genResult = (state: S) => ({
      state: reactOnEntry(
        state,
        obtain,
        reaction,
      ),
      forward,
      context: trackedContext,
    });

    const forward: Forward<S, E, C> = async (e: E, s = trackedState) => {
      const newState = await handleWithExitReaction(
        e,
        trackedState,
        s, // "oldState" can be manipulated via user by providing one
      );

      // this is important to be before calling `cbChildrenWrapper`
      // as `obtain` relies on up to date `trackedState`
      trackedState = newState;
      cbChildrenWrapper(newState);

      return genResult(newState);
    };

    const cbChildrenWrapper = (state: S) =>
      callbackChildren(state, obtain, children);

    if (init) {
      init(obtain);
    }

    const children = adaptChildren(obtain);

    cbChildrenWrapper(state);

    return skipInitialReaction ? { state, forward } : genResult(state);
  };

  return initialPublicForward;
}

function callbackChildren<S extends Keyable, E, C>(
  state: S,
  obtain: Obtain<S, E, C>,
  children: Children<S, E, C> = {},
) {
  const cb = children[state];
  if (cb) {
    cb(obtain);
  }
}

// just to give an illusion of "OOP" style
// this is just a wrapper of `genForward` anyway
function genCreateMachine<S extends Keyable, E, C>(
  defaultContext: C,
  handle: Handle<S, E, C>,
  adaptChildren: ChildrenWithOnce<S, E, C> = () => ({}),
) {
  const factory = genForward(defaultContext, handle, adaptChildren);

  return (
    state: S,
    options: ForwardFactoryOptions<S, E, C> = {
      reaction: {},
      skipInitialReaction: false,
    },
  ) => {
    let { forward } = factory(
      state,
      options,
    );

    let trackedState = state;

    const advance = async (e: E, s = trackedState) => {
      const { state: newState, forward: f, context } = await forward(e, s);

      forward = f;
      trackedState = newState;

      return {
        state: newState,
        context,
      };
    };

    return advance;
  };
}

const wrapChildren = <S extends Keyable, E, C>(
  ambiguousChildren: ChildrenAmbiguous<S, E, C>,
) => {
  if (typeof ambiguousChildren === 'function') {
    return ambiguousChildren as ChildrenWithOnce<S, E, C>;
  }

  return () => (ambiguousChildren as Children<S, E, C>);
};

const genDefineMachine = <S extends Keyable, E, C>() =>
(
  m: Machine<S, E, C>, // to branch to require `defaultContext` when C is not a null type
) => {
  const {
    defaultContext = bareContext as C,
    handle,
    children = {},
  } = m as ContextMachine<S, E, C>;
  // above is safe to do so as long as we are aware of that
  // `defaultContext` will not be delivered (or delivered with a `null` value) when C is a null type

  const wrappedChildren = wrapChildren<S, E, C>(children);

  return {
    initialForward: genForward<S, E, C>(
      defaultContext,
      handle,
      wrappedChildren,
    ),
    createMachine: genCreateMachine<S, E, C>(
      defaultContext,
      handle,
      wrappedChildren,
    ),
  };
};

const genDefineReaction =
  <S extends Keyable, E, C>() => (reaction: Reaction<S, E, C>) => reaction;

const genDefineChildren =
  <S extends Keyable, E, C>() => (children: ChildrenAmbiguous<S, E, C>) =>
    wrapChildren(children);

const genDefineInit =
  <S extends Keyable, E, C>() => (init: ObtainHook<S, E, C>) => init;

const genObtainHook =
  <S extends Keyable, E, C>() => (obtainHook: ObtainHook<S, E, C>) =>
    obtainHook;

// Now the result of handle can be both promise or not
const resolveHandleResult = <S, E, C>(
  potentialBareHandle: HandleAmbiguous<S, E, C>,
) =>
(p: HandleParams<S, E, C>) => Promise.resolve(potentialBareHandle(p));

const genDefineHandle =
  <S extends Keyable, E, C>() => (handle: HandleAmbiguous<S, E, C>) =>
    resolveHandleResult(handle);

const genDefineContext = <C>() => (c: C) => c;

// use like below to expose interface to be used
// `export const { ... } = genAPI<S..., E...>`
export const genAPI = <
  S extends Keyable,
  E,
  C = null,
>() => ({
  defineReaction: genDefineReaction<S, E, C>(),
  defineChildren: genDefineChildren<S, E, C>(),
  defineInit: genDefineInit<S, E, C>(),
  defineObtainHook: genObtainHook<S, E, C>(),
  // use like below to expose interface to be used
  // `export const { ... } = defineMachine({...})
  defineMachine: genDefineMachine<S, E, C>(),
  defineHandle: genDefineHandle<S, E, C>(),
  defineContext: genDefineContext<C>(),
});
