import { match } from 'ts-pattern';
import { BaseContext, genAPI } from '../fwrd/mod.ts';

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

export const genStore = <C extends BaseContext>(defaultContext: C) => {
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

  const { createMachine } = defineMachine({
    defaultContext,
    handle,
  });

  return { createMachine, defineReaction, setValue, getValue };
};
