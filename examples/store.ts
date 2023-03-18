import { match } from 'ts-pattern';
import { genAPI } from '../fwrd/mod.ts';

// Yeah it's a bit of effort for a simple feature but still a prove the concept

export enum State {
  created,
  saved,
  accessed,
}

export enum Events {
  setValue,
  getValue,
}

export const genStore = <C>(defaultContext: C) => {
  type SetValue = {
    _event: Events.setValue;
    value: C;
  };

  type GetValue = {
    _event: Events.getValue;
  };

  const setValue = (value: SetValue['value']): SetValue => ({
    _event: Events.setValue,
    value: value as SetValue['value'],
  });

  const getValue = (): GetValue => ({
    _event: Events.getValue,
  });

  type Event = SetValue | GetValue;

  const { defineMachine, defineReaction, defineHandle } = genAPI<
    State,
    Event,
    C
  >();

  const handle = defineHandle(({ event, updateContext = () => {} }) =>
    match(event._event)
      .with(Events.getValue, () => State.accessed)
      .with(Events.setValue, () => {
        updateContext((event as SetValue).value);
        return State.saved;
      })
      .run()
  );

  const { createMachine } = defineMachine(
    {
      defaultContext,
      handle,
      // `as Parameters ...` is necessary here with current typescript implementation ~= v4.9
      // because this code still don't get to have any concrete type (even if defaultContext branches to null and non-null) at compile time
      // but we know this will work in runtime
    } as Parameters<typeof defineMachine>[0],
  );

  return { createMachine, defineReaction, setValue, getValue };
};
