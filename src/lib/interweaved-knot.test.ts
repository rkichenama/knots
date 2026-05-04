import { describe, it, expect } from 'vitest';
import { InterweavedKnot } from './interweaved-knot';
import { Knot } from './knot';

describe('InterweavedKnot constructor', () => {
  it('throws when parts is 0', () => {
    expect(() => new InterweavedKnot({ parts: 0, bights: 6, strands: [] })).toThrow();
  });

  it('throws when bights is 0', () => {
    expect(() => new InterweavedKnot({ parts: 5, bights: 0, strands: [] })).toThrow();
  });

  it('computes numStrands as gcd(parts, bights)', () => {
    const k = new InterweavedKnot({ parts: 4, bights: 6, strands: [{}, {}] });
    expect(k.numStrands).toBe(2);
  });

  it('single-strand case: numStrands = 1', () => {
    const k = new InterweavedKnot({ parts: 5, bights: 6, strands: [{}] });
    expect(k.numStrands).toBe(1);
  });

  it('stores parts and bights', () => {
    const k = new InterweavedKnot({ parts: 4, bights: 6, strands: [{}, {}] });
    expect(k.parts).toBe(4);
    expect(k.bights).toBe(6);
  });
});

describe('InterweavedKnot strands', () => {
  it('creates numStrands Knot instances', () => {
    const k = new InterweavedKnot({ parts: 4, bights: 6, strands: [{}, {}] });
    expect(k.strands.length).toBe(2);
  });

  it('each strand has parts / numStrands parts', () => {
    const k = new InterweavedKnot({ parts: 4, bights: 6, strands: [{}, {}] });
    expect(k.strands[0].parts).toBe(2);
    expect(k.strands[1].parts).toBe(2);
  });

  it('each strand has bights / numStrands bights', () => {
    const k = new InterweavedKnot({ parts: 4, bights: 6, strands: [{}, {}] });
    expect(k.strands[0].bights).toBe(3);
    expect(k.strands[1].bights).toBe(3);
  });

  it('single-strand case produces same knot as direct Knot construction', () => {
    const k = new InterweavedKnot({ parts: 5, bights: 6, strands: [{}] });
    const direct = new Knot({ parts: 5, bights: 6 });
    expect(k.strands[0].parts).toBe(direct.parts);
    expect(k.strands[0].bights).toBe(direct.bights);
    expect(k.strands[0].coding).toBe(direct.coding);
  });

  it('passes strand color to strand knot', () => {
    const k = new InterweavedKnot({ parts: 4, bights: 6, strands: [{ color: '#ff0000' }, { color: '#0000ff' }] });
    expect(k.strandColors[0]).toBe('#ff0000');
    expect(k.strandColors[1]).toBe('#0000ff');
  });

  it('fills missing colors from default palette', () => {
    const k = new InterweavedKnot({ parts: 4, bights: 6, strands: [{}, {}] });
    expect(k.strandColors[0]).toBeTruthy();
    expect(k.strandColors[1]).toBeTruthy();
  });

  it('uses strand-specific pattern if provided', () => {
    const k = new InterweavedKnot({ parts: 4, bights: 6, strands: [{ pattern: '\\' }, { pattern: '/' }] });
    expect(k.strands[0].pattern).toBe('\\');
    expect(k.strands[1].pattern).toBe('/');
  });

  it('uses strand-specific sobre if provided', () => {
    const k = new InterweavedKnot({ parts: 4, bights: 6, strands: [{ sobre: true }, { sobre: false }] });
    expect(k.strands[0].sobre).toBe(true);
    expect(k.strands[1].sobre).toBe(false);
  });
});

describe('InterweavedKnot.combinedHalfCycles', () => {
  it('total length equals sum of all strand halfCycles lengths', () => {
    const k = new InterweavedKnot({ parts: 4, bights: 6, strands: [{}, {}] });
    const expected = k.strands.reduce((sum, s) => sum + s.halfCycles.length, 0);
    expect(k.combinedHalfCycles().length).toBe(expected);
  });

  it('result is sorted ascending by fromPin', () => {
    const k = new InterweavedKnot({ parts: 4, bights: 6, strands: [{}, {}] });
    const cycles = k.combinedHalfCycles();
    for (let i = 1; i < cycles.length; i++) {
      expect(cycles[i].fromPin).toBeGreaterThanOrEqual(cycles[i - 1].fromPin);
    }
  });

  it('single-strand combinedHalfCycles matches strand halfCycles', () => {
    const k = new InterweavedKnot({ parts: 5, bights: 6, strands: [{}] });
    expect(k.combinedHalfCycles().length).toBe(k.strands[0].halfCycles.length);
  });
});

describe('InterweavedKnot.combinedHalfCyclesWithStrand', () => {
  it('length equals sum of all strand halfCycles lengths', () => {
    const k = new InterweavedKnot({ parts: 4, bights: 6, strands: [{}, {}] });
    const expected = k.strands.reduce((sum, s) => sum + s.halfCycles.length, 0);
    expect(k.combinedHalfCyclesWithStrand().length).toBe(expected);
  });

  it('each entry has halfCycle and strandIndex', () => {
    const k = new InterweavedKnot({ parts: 4, bights: 6, strands: [{}, {}] });
    const entries = k.combinedHalfCyclesWithStrand();
    expect(entries[0]).toHaveProperty('halfCycle');
    expect(entries[0]).toHaveProperty('strandIndex');
  });

  it('strandIndex values are within valid range', () => {
    const k = new InterweavedKnot({ parts: 4, bights: 6, strands: [{}, {}] });
    for (const { strandIndex } of k.combinedHalfCyclesWithStrand()) {
      expect(strandIndex).toBeGreaterThanOrEqual(0);
      expect(strandIndex).toBeLessThan(k.numStrands);
    }
  });

  it('sorted ascending by fromPin', () => {
    const k = new InterweavedKnot({ parts: 4, bights: 6, strands: [{}, {}] });
    const entries = k.combinedHalfCyclesWithStrand();
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i].halfCycle.fromPin).toBeGreaterThanOrEqual(entries[i - 1].halfCycle.fromPin);
    }
  });

  it('single-strand: all strandIndex are 0', () => {
    const k = new InterweavedKnot({ parts: 5, bights: 6, strands: [{}] });
    for (const { strandIndex } of k.combinedHalfCyclesWithStrand()) {
      expect(strandIndex).toBe(0);
    }
  });

  it('multi-strand: contains entries from each strand', () => {
    const k = new InterweavedKnot({ parts: 4, bights: 6, strands: [{}, {}] });
    const indices = new Set(k.combinedHalfCyclesWithStrand().map(e => e.strandIndex));
    expect(indices.has(0)).toBe(true);
    expect(indices.has(1)).toBe(true);
  });
});
