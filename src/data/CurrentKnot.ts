import { signal } from '@preact/signals-react';
import { InterweavedKnot, Knot } from '../lib';

export const CurrentKnot = (window['knot'] = signal<Knot>(new Knot({
  bights: 6, parts: 5
})));

export const KnotError = signal<string>('');

export const StrandCount = signal<number>(1);
export const CurrentInterweaved = signal<InterweavedKnot | null>(null);