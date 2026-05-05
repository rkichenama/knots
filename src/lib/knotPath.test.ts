import { describe, it, expect } from 'vitest';
import { pinY, pinX, segmentFromHalfCycle, lineIntersection, buildCrossingRegistry, Segment } from './knotPath';
import { InterweavedKnot } from './interweaved-knot';

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

describe('buildCrossingRegistry', () => {
  it('returns a map with entries for each half-cycle that has crossings', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [] });
    const unit = 20;
    const width = knot.parts * unit;
    const segments: Segment[] = [];
    knot.strands.forEach((strand, si) => {
      strand.halfCycles.forEach((hc, hi) => {
        segments.push(segmentFromHalfCycle(hc, hi, si, unit, width));
      });
    });
    const registry = buildCrossingRegistry(knot.strands, segments);
    expect(registry.size).toBeGreaterThan(0);
  });

  it('each crossing has a boolean isOver value', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [] });
    const unit = 20;
    const width = knot.parts * unit;
    const segments: Segment[] = [];
    knot.strands.forEach((strand, si) => {
      strand.halfCycles.forEach((hc, hi) => {
        segments.push(segmentFromHalfCycle(hc, hi, si, unit, width));
      });
    });
    const registry = buildCrossingRegistry(knot.strands, segments);
    registry.forEach(crossings => {
      crossings.forEach(cp => {
        expect(typeof cp.isOver).toBe('boolean');
        expect(typeof cp.coord.x).toBe('number');
        expect(typeof cp.coord.y).toBe('number');
      });
    });
  });
});
