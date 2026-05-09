import { describe, it, expect } from 'vitest';
import { getPinPositions, MandrelMetrics } from './unrolled-mandrel';
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
