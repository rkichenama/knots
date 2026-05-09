import { describe, it, expect } from 'vitest';
import {
  computeMandrelPieces,
  MandrelMetricsFSA,
  MandrelPiece,
  // Legacy types still exported — just verify they import without error
  MandrelPin,
  MandrelLine,
  MandrelCrossing,
  MandrelMetrics,
  getPinPositions,
  getHalfCycleLines,
  getCrossings,
  makeMandrelMetrics,
} from './unrolled-mandrel';
import { InterweavedKnot } from './interweaved-knot';

// ── Legacy stub smoke-tests ──────────────────────────────────────────────────
// getPinPositions / getHalfCycleLines / getCrossings are now stubs that return [].
// We just verify they still export and return arrays (not throw).

describe('legacy stubs', () => {
  it('makeMandrelMetrics returns a valid MandrelMetrics object', () => {
    const m = makeMandrelMetrics(12, 4);
    expect(m.strandWidth).toBe(12);
    expect(m.gapWidth).toBe(4);
    expect(m.cellSize).toBe(16);
    expect(m.margin).toBe(32);
    expect(m.pinRadius).toBe(2);
    expect(m.outlineWidth).toBe(2);
  });

  it('getPinPositions returns empty arrays (stub)', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const m = makeMandrelMetrics(12, 4);
    const { left, right } = getPinPositions(knot, m);
    expect(Array.isArray(left)).toBe(true);
    expect(Array.isArray(right)).toBe(true);
  });

  it('getHalfCycleLines returns empty array (stub)', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const m = makeMandrelMetrics(12, 4);
    const lines = getHalfCycleLines(knot, m);
    expect(Array.isArray(lines)).toBe(true);
  });

  it('getCrossings returns empty array (stub)', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const m = makeMandrelMetrics(12, 4);
    const crossings = getCrossings([], knot, m);
    expect(Array.isArray(crossings)).toBe(true);
  });
});

// ── computeMandrelPieces ─────────────────────────────────────────────────────

describe('computeMandrelPieces — metrics', () => {
  it('returns metrics with positive canvasWidth and canvasHeight', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const { metrics } = computeMandrelPieces(knot, 20);
    expect(metrics.canvasWidth).toBeGreaterThan(0);
    expect(metrics.canvasHeight).toBeGreaterThan(0);
  });

  it('canvasHeight = numStrands * bights_per_strand * bightDist for single-strand knot', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const { metrics } = computeMandrelPieces(knot, 20);
    // canvasHeight = ceil(numStrands * strandBights * bightDist)
    // For single strand: Math.ceil(1 * 4 * bightDist)
    const strandBights = knot.strands[0].bights;
    expect(metrics.canvasHeight).toBe(Math.ceil(knot.numStrands * strandBights * metrics.bightDist));
  });

  it('bightDist = (strandWidth * 1.35) * sqrt(2) (FSA cellSize * 2)', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const sw = 20;
    const { metrics } = computeMandrelPieces(knot, sw);
    // bightDist = cellSize * 2, cellSize = (s + s*0.35) * sqrt(2) / 2 = s * 1.35 * sqrt(2) / 2
    const expected = (sw + sw * 0.35) * Math.sqrt(2) / 2 * 2;
    expect(metrics.bightDist).toBeCloseTo(expected);
  });

  it('angle is in (0, PI/2)', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const { metrics } = computeMandrelPieces(knot, 20);
    expect(metrics.angle).toBeGreaterThan(0);
    expect(metrics.angle).toBeLessThan(Math.PI / 2);
  });

  it('dx is positive', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const { metrics } = computeMandrelPieces(knot, 20);
    expect(metrics.dx).toBeGreaterThan(0);
  });

  it('dy is negative (going up per step)', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const { metrics } = computeMandrelPieces(knot, 20);
    expect(metrics.dy).toBeLessThan(0);
  });

  it('partDist * parts ≈ hypotenuse of (canvasInnerWidth, adj)', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const { metrics } = computeMandrelPieces(knot, 20);
    // dx = partDist * sin(angle), so parts*dx = parts*partDist*sin(angle)
    // This is not a simple invariant to check, but we can verify Pythagoras:
    // partDist^2 = dx^2 + dy^2
    expect(metrics.partDist * metrics.partDist).toBeCloseTo(
      metrics.dx * metrics.dx + metrics.dy * metrics.dy
    );
  });

  it('metrics.strandWidth equals input strandWidth', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const sw = 15;
    const { metrics } = computeMandrelPieces(knot, sw);
    expect(metrics.strandWidth).toBe(sw);
  });

  it('innerWidth scales by numStrands for multi-strand knot', () => {
    // 6P×4B → gcd=2, numStrands=2, strandParts=3, strandBights=2
    const knot1 = new InterweavedKnot({ parts: 6, bights: 4, strands: [{}, {}] });
    const sw = 20;
    const { metrics: m1 } = computeMandrelPieces(knot1, sw);

    // Single strand equivalent: 3P×2B
    const knot2 = new InterweavedKnot({ parts: 3, bights: 2, strands: [{}] });
    const { metrics: m2 } = computeMandrelPieces(knot2, sw);

    // The 2-strand knot's canvas must be strictly wider than the 1-strand equivalent
    // (innerWidth doubles; even with edge margin changes canvasWidth must be larger)
    expect(m1.canvasWidth).toBeGreaterThan(m2.canvasWidth);

    // And the 2-strand inner contribution should be ~2x the 1-strand inner contribution.
    // innerWidth = ceil(strandParts * cellSize * numStrands), so ratio should be ~2
    const d = sw * 0.35;
    const cellSize = (sw + d) * Math.sqrt(2) / 2;
    const strandParts = knot2.strands[0].parts;
    const inner1 = Math.ceil(strandParts * cellSize * 1);
    const inner2 = Math.ceil(strandParts * cellSize * 2);
    // canvasWidth = innerWidth + edgeMargin*2, edgeMargin depends on angle which depends on innerWidth
    // Just verify the difference in canvasWidth is at least half the expected inner difference
    expect(m1.canvasWidth - m2.canvasWidth).toBeGreaterThan((inner2 - inner1) * 0.5);
  });
});

describe('computeMandrelPieces — pieces structure', () => {
  it('returns pieces array with length = numStrands', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const { pieces } = computeMandrelPieces(knot, 20);
    expect(pieces.length).toBe(knot.numStrands);
  });

  it('multi-strand: pieces array has one entry per strand', () => {
    const knot = new InterweavedKnot({ parts: 4, bights: 6, strands: [{}, {}] });
    const { pieces } = computeMandrelPieces(knot, 20);
    expect(pieces.length).toBe(2);
  });

  it('each strand has (parts-1)*(2*bights) + 2*bights pieces total', () => {
    // Each HC contributes (parts-1) crossings + 1 miter = parts pieces.
    // There are 2*bights HCs per strand.
    // Total = parts * 2 * bights pieces per strand.
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const strand = knot.strands[0];
    const { pieces } = computeMandrelPieces(knot, 20);
    const expected = strand.parts * strand.halfCycles.length;
    expect(pieces[0].length).toBe(expected);
  });

  it('piece types are valid enum values', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const { pieces } = computeMandrelPieces(knot, 20);
    const validTypes = new Set(['right', 'left', 'right_miter', 'left_miter']);
    for (const strand of pieces) {
      for (const p of strand) {
        expect(validTypes.has(p.type)).toBe(true);
      }
    }
  });

  it('miter pieces have uo=null', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const { pieces } = computeMandrelPieces(knot, 20);
    for (const strand of pieces) {
      for (const p of strand) {
        if (p.type === 'right_miter' || p.type === 'left_miter') {
          expect(p.uo).toBeNull();
        }
      }
    }
  });

  it('crossing pieces have uo = O or U', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const { pieces } = computeMandrelPieces(knot, 20);
    for (const strand of pieces) {
      for (const p of strand) {
        if (p.type === 'right' || p.type === 'left') {
          expect(p.uo === 'O' || p.uo === 'U').toBe(true);
        }
      }
    }
  });

  it('piece strandIndex matches strand array index', () => {
    const knot = new InterweavedKnot({ parts: 4, bights: 6, strands: [{}, {}] });
    const { pieces } = computeMandrelPieces(knot, 20);
    pieces.forEach((strandPieces, si) => {
      for (const p of strandPieces) {
        expect(p.strandIndex).toBe(si);
      }
    });
  });

  it('hcIndex is in [0, 2*bights)', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const { pieces } = computeMandrelPieces(knot, 20);
    const maxHC = knot.strands[0].halfCycles.length;
    for (const strand of pieces) {
      for (const p of strand) {
        expect(p.hcIndex).toBeGreaterThanOrEqual(0);
        expect(p.hcIndex).toBeLessThan(maxHC);
      }
    }
  });

  it('HC0 pieces have type=right, HC1 pieces have type=left (or miter equivalent)', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const { pieces } = computeMandrelPieces(knot, 20);
    const hc0 = pieces[0].filter(p => p.hcIndex === 0);
    const hc1 = pieces[0].filter(p => p.hcIndex === 1);
    // All HC0 pieces should be 'right' or 'right_miter'
    for (const p of hc0) {
      expect(p.type === 'right' || p.type === 'right_miter').toBe(true);
    }
    // All HC1 pieces should be 'left' or 'left_miter'
    for (const p of hc1) {
      expect(p.type === 'left' || p.type === 'left_miter').toBe(true);
    }
  });

  it('x coordinates are finite numbers', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 6, strands: [{}] });
    const { pieces } = computeMandrelPieces(knot, 20);
    for (const strand of pieces) {
      for (const p of strand) {
        expect(isFinite(p.x)).toBe(true);
        expect(isFinite(p.y)).toBe(true);
      }
    }
  });

  it('y coordinates are within [0, canvasHeight)', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const { metrics, pieces } = computeMandrelPieces(knot, 20);
    for (const strand of pieces) {
      for (const p of strand) {
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThan(metrics.canvasHeight);
      }
    }
  });
});

describe('computeMandrelPieces — free-run knot (4P×3B)', () => {
  it('4P×3B knot produces pieces without throwing', () => {
    const knot = new InterweavedKnot({ parts: 4, bights: 3, strands: [{}] });
    expect(() => computeMandrelPieces(knot, 20)).not.toThrow();
  });

  it('pieces for 4P×3B have the right count', () => {
    const knot = new InterweavedKnot({ parts: 4, bights: 3, strands: [{}] });
    const strand = knot.strands[0];
    const { pieces } = computeMandrelPieces(knot, 20);
    const expected = strand.parts * strand.halfCycles.length;
    expect(pieces[0].length).toBe(expected);
  });
});
