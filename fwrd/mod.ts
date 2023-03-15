type StateToState<S, E> = (s: S, e: E) => Promise<S>;
type StateToStateNoPromise<S, E> = (s: S, e: E) => S;
type StateToStateAmbiguous<S, E> =
  | StateToState<S, E>
  | StateToStateNoPromise<S, E>;

type ForwardReturn<S, E> = { state: S; forward: Forward<S, E> };

type Forward<S, E> = (e: E, s?: S) => Promise<ForwardReturn<S, E>>;

type ObtainKit<S, E, C> = { state: S; forward: Forward<S, E>; context: C };
type Obtain<S, E, C> = () => ObtainKit<S, E, C>;
type ObtainHook<S, E, C> = (o: Obtain<S, E, C>) => void;

type ReactionHandler<S, E, C> = (p: ObtainKit<S, E, C>) => void;

type Machine<S extends Keyable, E, C> = {
  defaultContext: C;
  handle: StateToState<S, E>;
  children?: ChildrenAmbiguous<S, E, C>;
};

type ReactionBundle<S, E, C> = {
  entry?: ReactionHandler<S, E, C>;
  exit?: ReactionHandler<S, E, C>;
};

type Keyable = string | number | symbol;

type Wildcard = '*';
const wildcard: Wildcard = '*' as const;

type BaseContext = Record<Keyable, unknown>;
const bareContext: BaseContext = {};
// I couldn't find a way yet to provide this by default for all generics
// so machine creator will have to do the below in case no context is being used
// (but at least having to set a Phantom type is avoided thanks to `C extends BaseContext = BaseContext`)
// do this `defineMachine({...noContext, ...})` to avoid having to do `defineMachine({ defaultContext: {}, ... })`
export const noContext = { defaultContext: bareContext };

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
  handle: StateToState<S, E>,
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

    const obtain = () => ({
      state: trackedState,
      forward,
      context, // in the future where context also gets updated, this would `trackedContext`
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
        obtain,
        reaction,
      );

    let trackedState = state;

    const genResult = (state: S) => ({
      state: reactOnEntry(
        state,
        obtain,
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
  handle: StateToState<S, E>,
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
      const { state: newState, forward: f } = await forward(e, s);

      forward = f;
      trackedState = newState;

      return newState;
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

const genDefineMachine =
  <S extends Keyable, E, C>() =>
  ({ defaultContext, handle, children = {} }: Machine<S, E, C>) => ({
    initialForward: genForward(defaultContext, handle, wrapChildren(children)),
    createMachine: genCreateMachine(
      defaultContext,
      handle,
      wrapChildren(children),
    ),
  });

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
const resolveHandleResult = <S, E>(
  potentialBareHandle: StateToStateAmbiguous<S, E>,
) =>
(s: S, e: E) => Promise.resolve(potentialBareHandle(s, e));

const genDefineHandle =
  <S extends Keyable, E>() => (handle: StateToStateAmbiguous<S, E>) =>
    resolveHandleResult(handle);

// use like below to expose interface to be used
// `export const { ... } = genAPI<S..., E...>`
export const genAPI = <
  S extends Keyable,
  E,
  C extends BaseContext = BaseContext,
>() => ({
  defineReaction: genDefineReaction<S, E, C>(),
  defineChildren: genDefineChildren<S, E, C>(),
  defineInit: genDefineInit<S, E, C>(),
  defineObtainHook: genObtainHook<S, E, C>(),
  // use like below to expose interface to be used
  // `export const { ... } = defineMachine({...})
  defineMachine: genDefineMachine<S, E, C>(),
  defineHandle: genDefineHandle<S, E>(),
});
