import { InterweavedKnot } from './interweaved-knot';
import { Point, lineIntersection } from './tying-logic';

// ─── Legacy types (kept for test compatibility) ───────────────────────────────

export type MandrelMetrics = {
  strandWidth: number;
  gapWidth: number;
  cellSize: number;
  margin: number;
  pinRadius: number;
  outlineWidth: number;
};

export type MandrelPin = Point & {
  strandIndex: number;
  pinNumber: number;
};

export type MandrelLine = {
  from: MandrelPin;
  to: MandrelPin;
  strandIndex: number;
  isBackslash: boolean;
  isFreeRun: boolean;
};

export type MandrelCrossing = {
  x: number;
  y: number;
  backslashLine: MandrelLine;
  slashLine: MandrelLine;
  isBackslashOver: boolean;
};

// Legacy factory — still works exactly as before
export function makeMandrelMetrics(strandWidth: number, gapWidth: number): MandrelMetrics {
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

// Stubs — no longer used by the new renderer; kept so existing tests that
// import them don't fail to compile (test suite was rewritten to use computeMandrelPieces).
export function getPinPositions(
  _knot: InterweavedKnot,
  _m: MandrelMetrics
): { left: MandrelPin[]; right: MandrelPin[] } {
  return { left: [], right: [] };
}

export function getHalfCycleLines(
  _knot: InterweavedKnot,
  _m: MandrelMetrics
): MandrelLine[] {
  return [];
}

export function getCrossings(
  _lines: MandrelLine[],
  _knot: InterweavedKnot,
  _m: MandrelMetrics
): MandrelCrossing[] {
  return [];
}

// ─── New FSA-style types ──────────────────────────────────────────────────────

export type MandrelPiece = {
  x: number;
  y: number;
  type: 'right' | 'left' | 'right_miter' | 'left_miter';
  uo: 'O' | 'U' | null; // null for miters
  strandIndex: number;
  hcIndex: number;
};

export type MandrelMetricsFSA = {
  strandWidth: number;
  gapSize: number;
  bightDist: number; // vertical spacing per bight = cellSize * 2
  partDist: number; // hypotenuse / parts
  angle: number; // radians
  dx: number; // x-step per part (positive, going right)
  dy: number; // y-step per part (negative, going up)
  canvasWidth: number;
  canvasHeight: number;
  knotGap: number;
};

// ─── computeMandrelPieces ────────────────────────────────────────────────────

/**
 * Compute the FSA-style crossing pieces and miter pieces for all strands.
 *
 * Returns metrics (canvas dimensions, geometry) and an array-of-arrays:
 *   pieces[strandIndex] = all pieces (crossings + miters) for that strand, in order.
 *
 * The geometry follows freakinsweetapps.com/knots/knotgrid (horizontal orient).
 */
export function computeMandrelPieces(
  knot: InterweavedKnot,
  strandWidth: number,
  knotGap?: number
): { metrics: MandrelMetricsFSA; pieces: MandrelPiece[][] } {
  const { numStrands } = knot;

  // Per-strand values
  const strand0 = knot.strands[0];
  const strandParts = strand0.parts;
  const strandBights = strand0.bights;

  // ── FSA canvas sizing (horizontal orient, auto-size) ─────────────────────
  // s = strandWidth, d = gapSize = s * 0.35
  // cellSize = (s + d) * sqrt(2) / 2
  // bightDist = cellSize * 2  (vertical spacing per bight)
  // height_per_strand = bights * bightDist   (= 2 * bights * cellSize)
  // width_per_strand  = parts * cellSize

  const s = strandWidth;
  const d = s * 0.35;
  const cellSize = (s + d) * Math.sqrt(2) / 2;
  const bightDist = cellSize * 2;

  const heightPerStrand = Math.ceil(2 * strandBights * cellSize); // = bights * bightDist
  const innerWidth = Math.ceil(strandParts * cellSize * numStrands);

  // ── FSA geometry ──────────────────────────────────────────────────────────
  // n = floor(strandParts / strandBights)
  // to_pin = hc[0].toPin + floor(n/2) * strandBights
  // adj = (to_pin - 1 + 0.5*(strandParts%2)) * bightDist
  // hyp = sqrt(adj^2 + width^2)
  // partDist = hyp / strandParts
  // angle = acos(adj / hyp)   // FSA: adj is VERTICAL leg
  // dx = partDist * sin(angle)
  // dy = -partDist * cos(angle)

  const n = Math.floor(strandParts / strandBights);
  const firstHC = strand0.halfCycles[0];
  const toPinFSA = firstHC.toPin + Math.floor(n / 2) * strandBights;
  const adj = (toPinFSA - 1 + 0.5 * (strandParts % 2)) * bightDist;

  const hyp = Math.sqrt(adj * adj + innerWidth * innerWidth);
  const partDist = hyp / strandParts;
  const angle = Math.acos(adj / hyp); // angle from horizontal (adj = vertical leg)
  const dx = partDist * Math.sin(angle); // positive, going right
  const dy = -partDist * Math.cos(angle); // negative, going up per step

  // Canvas dimensions match FSA exactly: no extra margin.
  // Miters land at x=0 (left edge) and x=innerWidth (right edge).
  // Extra half-strand-width is added so edge arcs aren't clipped.
  const edgeMargin = Math.ceil((strandWidth / 2) / Math.cos(angle) + 2);
  const canvasWidth = innerWidth + edgeMargin * 2;
  const resolvedGap = knotGap ?? bightDist / 2;
  const canvasHeight = numStrands * heightPerStrand + (numStrands - 1) * resolvedGap;
  // x-offset applied to all pieces so FSA's x=0 maps to edgeMargin on canvas
  const xOffset = edgeMargin;

  const metrics: MandrelMetricsFSA = {
    strandWidth,
    gapSize: d,
    bightDist,
    partDist,
    angle,
    dx,
    dy,
    canvasWidth,
    canvasHeight,
    knotGap: resolvedGap,
  };

  // ── Build pieces for each strand ─────────────────────────────────────────
  // FSA: startx=0, starty=0. Strand s is offset by s*bightDist vertically.
  // y wraps modulo totalHeight (full canvas height).

  const allPieces: MandrelPiece[][] = knot.strands.map((strand, strandIndex) => {
    const pieces: MandrelPiece[] = [];
    const { halfCycles, parts } = strand;

    let startx = 0; // FSA starts at 0; xOffset applied when pushing pieces
    let starty = strandIndex * (heightPerStrand + resolvedGap);

    halfCycles.forEach((hc, hcIndex) => {
      const goingRight = hcIndex % 2 === 0;

      // Emit crossing pieces (parts-1 per HC)
      for (let j = 0; j < parts - 1; j++) {
        const x = goingRight
          ? startx + (j + 1) * dx
          : startx - (j + 1) * dx;
        const rawY = starty + (j + 1) * dy;
        const y = ((rawY % canvasHeight) + canvasHeight) % canvasHeight;

        const type: MandrelPiece['type'] = goingRight ? 'right' : 'left';

        // O/U comes directly from halfCycle.runs — already accounts for sobre and CBN gating.
        // runs[j] is undefined for free-run positions (early HCs with fewer active crossings).
        const run = hc.runs[j] as 'O' | 'U' | undefined;
        const uo: 'O' | 'U' | null = run ?? null;
        pieces.push({ x: x + xOffset, y, type, uo, strandIndex, hcIndex });
      }

      // Advance startx/starty to bight (miter position)
      if (goingRight) {
        startx += parts * dx;
      } else {
        startx -= parts * dx;
      }
      const rawY = starty + parts * dy;
      starty = ((rawY % canvasHeight) + canvasHeight) % canvasHeight;

      const miterType: MandrelPiece['type'] = goingRight ? 'right_miter' : 'left_miter';
      pieces.push({ x: startx + xOffset, y: starty, type: miterType, uo: null, strandIndex, hcIndex });
    });

    return pieces;
  });

  return { metrics, pieces: allPieces };
}
