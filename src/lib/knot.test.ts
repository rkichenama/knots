import { describe, it, expect } from 'vitest';
import { Knot } from './knot';

describe('Knot constructor', () => {
  it('creates a knot with default props', () => {
    const k = new Knot({});
    expect(k.parts).toBe(5);
    expect(k.bights).toBe(6);
    expect(k.sobre).toBe(false);
    expect(k.pattern).toBe('\\/');
  });

  it('accepts custom parts and bights', () => {
    const k = new Knot({ parts: 3, bights: 4 });
    expect(k.parts).toBe(3);
    expect(k.bights).toBe(4);
  });

  it('accepts parts and bights with gcd > 1 (multi-strand handled by InterweavedKnot)', () => {
    const k = new Knot({ parts: 2, bights: 3 });
    expect(k.parts).toBe(2);
    expect(k.bights).toBe(3);
  });

  it('throws when parts is 0', () => {
    expect(() => new Knot({ parts: 0, bights: 5 })).toThrow();
  });

  it('throws when bights is 0', () => {
    expect(() => new Knot({ parts: 5, bights: 0 })).toThrow();
  });

  it('falls back to default pattern when empty string given', () => {
    const k = new Knot({ pattern: '' });
    expect(k.pattern).toBe('\\/');
  });
});

describe('Knot.fillCoding', () => {
  it('coding length is parts - 1', () => {
    const k = new Knot({ parts: 5, bights: 6 });
    expect(k.coding.length).toBe(4);
  });

  it('coding cycles through pattern', () => {
    const k = new Knot({ parts: 5, bights: 6, pattern: '\\/' });
    expect(k.coding).toBe('\\/\\/');
  });
});

describe('Knot.getPartFromType', () => {
  it('casa: isOver=true returns O', () => {
    const k = new Knot({ parts: 5, bights: 6, sobre: false });
    expect(k.getPartFromType(true)).toBe('O');
  });

  it('casa: isOver=false returns U', () => {
    const k = new Knot({ parts: 5, bights: 6, sobre: false });
    expect(k.getPartFromType(false)).toBe('U');
  });

  it('sobre: isOver=true returns U', () => {
    const k = new Knot({ parts: 5, bights: 6, sobre: true });
    expect(k.getPartFromType(true)).toBe('U');
  });

  it('sobre: isOver=false returns O', () => {
    const k = new Knot({ parts: 5, bights: 6, sobre: true });
    expect(k.getPartFromType(false)).toBe('O');
  });
});

describe('Knot.fillPins', () => {
  it('pins has length 2 * bights + 1', () => {
    const k = new Knot({ parts: 5, bights: 6 });
    expect(k.pins.length).toBe(2 * 6 + 1);
  });

  it('pins starts and ends at 1', () => {
    const k = new Knot({ parts: 5, bights: 6 });
    expect(k.pins[0]).toBe(1);
    expect(k.pins[k.pins.length - 1]).toBe(1);
  });

  it('pins computed for even parts', () => {
    const k = new Knot({ parts: 4, bights: 3 });
    expect(k.pins[0]).toBe(1);
    expect(k.pins.length).toBe(2 * 3 + 1);
  });
});

describe('Knot.fillHalfCycles', () => {
  it('halfCycles count equals 2 * bights', () => {
    const k = new Knot({ parts: 5, bights: 6 });
    expect(k.halfCycles.length).toBe(2 * 6);
  });

  it('halfCycles fromPin and toPin match consecutive pins', () => {
    const k = new Knot({ parts: 5, bights: 6 });
    expect(k.halfCycles[0].fromPin).toBe(k.pins[0]);
    expect(k.halfCycles[0].toPin).toBe(k.pins[1]);
  });
});

describe('Knot.steps', () => {
  it('returns array of strings', () => {
    const k = new Knot({ parts: 5, bights: 6 });
    const s = k.steps();
    expect(Array.isArray(s)).toBe(true);
    expect(s.length).toBeGreaterThan(0);
    expect(typeof s[0]).toBe('string');
  });

  it('step strings contain pin info', () => {
    const k = new Knot({ parts: 5, bights: 6 });
    expect(k.steps()[0]).toMatch(/pin \d+ to/);
  });

  it('alternates top/bot labels', () => {
    const k = new Knot({ parts: 5, bights: 6 });
    const s = k.steps();
    expect(s[0]).toMatch(/^bot/);
    expect(s[1]).toMatch(/^top/);
    expect(s[2]).toMatch(/^bot/);
  });
});
