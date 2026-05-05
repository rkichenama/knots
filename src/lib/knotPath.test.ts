import { describe, it, expect } from 'vitest';
import { pinY, pinX, segmentFromHalfCycle, lineIntersection, gridCrossings, Segment } from './knotPath';
import { InterweavedKnot } from './interweaved-knot';
import { Knot } from './knot';

describe('pinY', () => {
  it('pin 1 maps to unit/2', () => {
    expect(pinY(1, 20)).toBeCloseTo(10);
  });
  it('pin 2 maps to 2*unit + unit/2', () => {
    expect(pinY(2, 20)).toBeCloseTo(50);
  });
  it('pin 3 maps to 4*unit + unit/2', () => {
    expect(pinY(3, 20)).toBeCloseTo(90);
  });
});

describe('pinX', () => {
  it('left edge returns 0', () => {
    expect(pinX('left', 200)).toBe(0);
  });
  it('right edge returns width', () => {
    expect(pinX('right', 200)).toBe(200);
  });
});

describe('lineIntersection', () => {
  it('finds intersection of two crossing diagonals', () => {
    const pt = lineIntersection({ x: 0, y: 100 }, { x: 100, y: 0 }, { x: 0, y: 0 }, { x: 100, y: 100 });
    expect(pt).not.toBeNull();
    expect(pt!.x).toBeCloseTo(50);
    expect(pt!.y).toBeCloseTo(50);
  });

  it('returns null for parallel lines', () => {
    const pt = lineIntersection({ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 10 }, { x: 100, y: 110 });
    expect(pt).toBeNull();
  });

  it('returns null when lines do not intersect within segments', () => {
    const pt = lineIntersection({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }, { x: 30, y: 10 });
    expect(pt).toBeNull();
  });
});

describe('segmentFromHalfCycle', () => {
  it('half-cycle index 0 (even) starts on right edge', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [] });
    const strand = knot.strands[0];
    const unit = 20;
    const width = knot.parts * unit;
    const seg = segmentFromHalfCycle(strand.halfCycles[0], 0, 0, unit, width);
    expect(seg.from.x).toBe(width);
  });

  it('half-cycle index 1 (odd) starts on left edge', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [] });
    const strand = knot.strands[0];
    const unit = 20;
    const width = knot.parts * unit;
    const seg = segmentFromHalfCycle(strand.halfCycles[1], 1, 0, unit, width);
    expect(seg.from.x).toBe(0);
  });
});

describe('gridCrossings', () => {
  it('returns (parts-1)*bights crossings', () => {
    const knot = new Knot({ parts: 7, bights: 6 });
    const crossings = gridCrossings(knot, 20, 10);
    expect(crossings.length).toBe((7 - 1) * 6);
  });

  it('each crossing has numeric x, y and boolean isOver', () => {
    const knot = new Knot({ parts: 5, bights: 4 });
    const crossings = gridCrossings(knot, 20, 10);
    for (const cp of crossings) {
      expect(typeof cp.x).toBe('number');
      expect(typeof cp.y).toBe('number');
      expect(typeof cp.isOver).toBe('boolean');
    }
  });

  it('sobre=true inverts all isOver values vs sobre=false', () => {
    const knot = new Knot({ parts: 5, bights: 4, sobre: false });
    const knotSobre = new Knot({ parts: 5, bights: 4, sobre: true });
    const c1 = gridCrossings(knot, 20, 10);
    const c2 = gridCrossings(knotSobre, 20, 10);
    for (let i = 0; i < c1.length; i++) {
      expect(c2[i].isOver).toBe(!c1[i].isOver);
    }
  });

  it('crossing x positions span from margin+cellSize/2 to margin+(parts-2)*cellSize+cellSize/2', () => {
    const knot = new Knot({ parts: 5, bights: 4 });
    const cellSize = 20,
      margin = 10;
    const crossings = gridCrossings(knot, cellSize, margin);
    const xs = [...new Set(crossings.map(c => c.x))].sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(margin + cellSize / 2);
    expect(xs[xs.length - 1]).toBeCloseTo(margin + (knot.parts - 2) * cellSize + cellSize / 2);
  });
});
