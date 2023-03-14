import { createMachine } from '../delay.ts';

export function runner() {
  createMachine(2000);
}
