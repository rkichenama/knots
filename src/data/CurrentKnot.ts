import { signal } from '@preact/signals-react';
import { Knot } from '../lib';

export const CurrentKnot = (window['knot'] = signal<Knot>(new Knot({
  bights: 6, parts: 5
})));

export const KnotError = signal<string>('');