import { describe, it, expect } from 'vitest';
import { getPinPositions, getHalfCycleLines, getCrossings, MandrelMetrics } from './unrolled-mandrel';
import { InterweavedKnot } from './interweaved-knot';

function makeMetrics(strandWidth = 12, gapWidth = 4): MandrelMetrics {
  const cellSize = strandWidth + gapWidth;
  return {
    strandWidth,
    gapWidth,
    cellSize,
    margin: cellSize * 2,
    pinRadius: gapWidth / 2,
    outlineWidth: 2,
  };
}

describe('getPinPositions', () => {
  it('returns left and right arrays of equal length', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const m = makeMetrics();
    const { left, right } = getPinPositions(knot, m);
    expect(left.length).toBe(right.length);
  });

  it('total pins = numStrands × bights', () => {
    const knot = new InterweavedKnot({ parts: 4, bights: 6, strands: [{}, {}] });
    const m = makeMetrics();
    const { left } = getPinPositions(knot, m);
    expect(left.length).toBe(knot.numStrands * knot.bights);
  });

  it('left pins all have x = margin', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const m = makeMetrics();
    const { left } = getPinPositions(knot, m);
    for (const p of left) {
      expect(p.x).toBe(m.margin);
    }
  });

  it('right pins all have x = margin + mandrelWidth', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const m = makeMetrics();
    const mandrelWidth = (knot.parts - 1) * m.cellSize;
    const { right } = getPinPositions(knot, m);
    for (const p of right) {
      expect(p.x).toBeCloseTo(m.margin + mandrelWidth);
    }
  });

  it('pin Y values are spaced by cellSize', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const m = makeMetrics();
    const { left } = getPinPositions(knot, m);
    for (let i = 1; i < left.length; i++) {
      expect(left[i].y - left[i - 1].y).toBeCloseTo(m.cellSize);
    }
  });

  it('each pin carries strandIndex in range [0, numStrands)', () => {
    const knot = new InterweavedKnot({ parts: 4, bights: 6, strands: [{}, {}] });
    const m = makeMetrics();
    const { left } = getPinPositions(knot, m);
    for (const p of left) {
      expect(p.strandIndex).toBeGreaterThanOrEqual(0);
      expect(p.strandIndex).toBeLessThan(knot.numStrands);
    }
  });

  it('pins interleave strands: pin[0]=strand0, pin[1]=strand1, pin[2]=strand0...', () => {
    const knot = new InterweavedKnot({ parts: 4, bights: 6, strands: [{}, {}] });
    const m = makeMetrics();
    const { left } = getPinPositions(knot, m);
    expect(left[0].strandIndex).toBe(0);
    expect(left[1].strandIndex).toBe(1);
    expect(left[2].strandIndex).toBe(0);
  });

  it('odd parts: right pins offset up by cellSize/2', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const m = makeMetrics();
    const { left, right } = getPinPositions(knot, m);
    expect(right[0].y).toBeCloseTo(left[0].y - m.cellSize / 2);
  });

  it('even parts: right pins same Y as left pins', () => {
    const knot = new InterweavedKnot({ parts: 4, bights: 6, strands: [{}, {}] });
    const m = makeMetrics();
    const { left, right } = getPinPositions(knot, m);
    expect(right[0].y).toBeCloseTo(left[0].y);
  });
});

describe('getHalfCycleLines', () => {
  it('returns one line per half-cycle per strand', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const m = makeMetrics();
    const lines = getHalfCycleLines(knot, m);
    const expected = knot.strands.reduce((s, strand) => s + strand.halfCycles.length, 0);
    expect(lines.length).toBe(expected);
  });

  it('each line has strandIndex in valid range', () => {
    const knot = new InterweavedKnot({ parts: 4, bights: 6, strands: [{}, {}] });
    const m = makeMetrics();
    const lines = getHalfCycleLines(knot, m);
    for (const l of lines) {
      expect(l.strandIndex).toBeGreaterThanOrEqual(0);
      expect(l.strandIndex).toBeLessThan(knot.numStrands);
    }
  });

  it('line from.x and to.x are margin or margin+mandrelWidth', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const m = makeMetrics();
    const mandrelWidth = (knot.parts - 1) * m.cellSize;
    const lines = getHalfCycleLines(knot, m);
    for (const l of lines) {
      expect([m.margin, m.margin + mandrelWidth]).toContain(l.from.x);
      expect([m.margin, m.margin + mandrelWidth]).toContain(l.to.x);
    }
  });

  it('from.x !== to.x (each line crosses mandrel)', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const m = makeMetrics();
    const lines = getHalfCycleLines(knot, m);
    for (const l of lines) {
      expect(l.from.x).not.toBe(l.to.x);
    }
  });

  it('isBackslash is true when line goes down (to.y > from.y)', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const m = makeMetrics();
    const lines = getHalfCycleLines(knot, m);
    for (const l of lines) {
      expect(l.isBackslash).toBe(l.to.y > l.from.y);
    }
  });

  it('free-run HCs (no runs) are marked isFreeRun=true', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const m = makeMetrics();
    const lines = getHalfCycleLines(knot, m);
    const strand = knot.strands[0];
    // Find any HC with no runs and verify the corresponding line is marked isFreeRun
    strand.halfCycles.forEach((hc, i) => {
      if (hc.runs.length === 0) {
        expect(lines[i].isFreeRun).toBe(true);
      } else {
        expect(lines[i].isFreeRun).toBe(false);
      }
    });
  });
});

describe('getCrossings', () => {
  it('returns array (may be empty for free-run only knots)', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const m = makeMetrics();
    const lines = getHalfCycleLines(knot, m);
    const crossings = getCrossings(lines, knot, m);
    expect(Array.isArray(crossings)).toBe(true);
  });

  it('crossing x is within mandrel bounds', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 6, strands: [{}] });
    const m = makeMetrics();
    const mandrelWidth = (knot.parts - 1) * m.cellSize;
    const lines = getHalfCycleLines(knot, m);
    const crossings = getCrossings(lines, knot, m);
    for (const c of crossings) {
      expect(c.x).toBeGreaterThan(m.margin);
      expect(c.x).toBeLessThan(m.margin + mandrelWidth);
    }
  });

  it('isBackslashOver is boolean', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 6, strands: [{}] });
    const m = makeMetrics();
    const lines = getHalfCycleLines(knot, m);
    const crossings = getCrossings(lines, knot, m);
    for (const c of crossings) {
      expect(typeof c.isBackslashOver).toBe('boolean');
    }
  });

  it('each crossing references a backslash line and slash line', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 6, strands: [{}] });
    const m = makeMetrics();
    const lines = getHalfCycleLines(knot, m);
    const crossings = getCrossings(lines, knot, m);
    for (const c of crossings) {
      expect(c.backslashLine.isBackslash).toBe(true);
      expect(c.slashLine.isBackslash).toBe(false);
    }
  });

  it('no crossings from free-run lines', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const m = makeMetrics();
    const lines = getHalfCycleLines(knot, m);
    const crossings = getCrossings(lines, knot, m);
    for (const c of crossings) {
      expect(c.backslashLine.isFreeRun).toBe(false);
      expect(c.slashLine.isFreeRun).toBe(false);
    }
  });
});
