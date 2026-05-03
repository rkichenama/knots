import { describe, it, expect } from 'vitest';
import { HalfCycle } from './halfcycle';

describe('HalfCycle', () => {
  it('initializes with fromPin and toPin', () => {
    const hc = new HalfCycle(3, 5);
    expect(hc.fromPin).toBe(3);
    expect(hc.toPin).toBe(5);
  });

  it('defaults fromPin and toPin to 1', () => {
    const hc = new HalfCycle();
    expect(hc.fromPin).toBe(1);
    expect(hc.toPin).toBe(1);
  });

  it('starts with empty runs', () => {
    const hc = new HalfCycle(1, 2);
    expect(hc.runs).toEqual([]);
  });

  it('append adds a step to runs', () => {
    const hc = new HalfCycle(1, 2);
    hc.append('O');
    expect(hc.runs).toEqual(['O']);
  });

  it('steps returns undefined when no runs', () => {
    const hc = new HalfCycle(1, 2);
    expect(hc.steps()).toBeUndefined();
  });

  it('steps returns single step without count', () => {
    const hc = new HalfCycle(1, 2);
    hc.append('O');
    expect(hc.steps()).toBe('O');
  });

  it('steps collapses consecutive identical steps with count', () => {
    const hc = new HalfCycle(1, 2);
    hc.append('O');
    hc.append('O');
    hc.append('O');
    expect(hc.steps()).toBe('O3');
  });

  it('steps keeps distinct consecutive steps separate', () => {
    const hc = new HalfCycle(1, 2);
    hc.append('O');
    hc.append('U');
    expect(hc.steps()).toBe('O U');
  });

  it('steps groups runs correctly with mixed pattern', () => {
    const hc = new HalfCycle(1, 2);
    hc.append('O');
    hc.append('O');
    hc.append('U');
    hc.append('U');
    hc.append('O');
    expect(hc.steps()).toBe('O2 U2 O');
  });
});
