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
  gapWidth: number; // kept for API compat; not used in FSA approach
  bightDist: number; // canvasHeight / totalPins
  partDist: number; // hypotenuse / parts
  angle: number; // radians
  dx: number; // x-step per part (positive, going right)
  dy: number; // y-step per part (negative, going up)
  canvasWidth: number;
  canvasHeight: number;
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
  strandWidth: number
): { metrics: MandrelMetricsFSA; pieces: MandrelPiece[][] } {
  const { numStrands, bights: knotBights, parts: knotParts } = knot;

  // Each strand has parts/numStrands crossing columns and bights/numStrands bight pins.
  // We use the per-strand values everywhere.
  const strand0 = knot.strands[0];
  const strandParts = strand0.parts; // = knotParts / numStrands
  const strandBights = strand0.bights; // = knotBights / numStrands

  // Total vertical pin slots across all strands
  const totalPins = numStrands * strandBights; // = knotBights

  // Pixel spacing between adjacent pin slots
  const bightDist = strandWidth * 2;

  // Canvas height spans all pin slots
  const canvasHeight = totalPins * bightDist;

  // ── Geometry (FSA horizontal orient) ────────────────────────────────────
  // The first HC toPin determines the slope angle.
  // FSA formula: to_pin = hc[0].toPin + floor(n/2)*bights
  // where n = knot.parts (full parts), bights = knotBights (full bights).
  // For a single strand this simplifies to hc[0].toPin because floor(strandParts/2)*strandBights
  // accounts for the strand's own geometry. We match FSA exactly using full-knot values.

  const firstHC = strand0.halfCycles[0];
  const n = strandParts; // "n" in FSA = the per-strand parts count
  const b = strandBights; // bights per strand

  // FSA's to_pin (0-based vertical distance in bight slots):
  // to_pin = hc0.toPin + floor(n/2)*b  — this gives the absolute vertical pin index
  const toPinFSA = firstHC.toPin + Math.floor(n / 2) * b;

  // Vertical distance from start row to to_pin row (in pixels), centred:
  // adj = (to_pin - 1 + 0.5*(n%2)) * bightDist
  const adj = (toPinFSA - 1 + 0.5 * (n % 2)) * bightDist;

  // Horizontal distance = canvas width (before we know it — FSA uses a fixed width).
  // We pick a canonical width: (strandParts-1) segments each dx wide, plus margins.
  // But dx depends on the angle which depends on the width — so we bootstrap:
  // FSA uses a provided canvas width. We derive it so the x-travel for (strandParts) steps
  // equals exactly canvasWidth (the inner span), matching the mandrel geometry.
  // Use: canvasWidth_inner such that partDist = hyp / parts and dx = partDist*sin(angle).
  // Choose: inner width = strandParts * bightDist * 2 as a starting point (matches typical FSA).
  const innerWidth = strandParts * bightDist * 2;

  const hyp = Math.sqrt(adj * adj + innerWidth * innerWidth);
  const partDist = hyp / strandParts;
  const angle = Math.acos(innerWidth / hyp); // angle from vertical (= acos(adj/hyp) in FSA but our adj=vertical, width=horizontal — swap)

  // FSA for horizontal orient:
  //   dx = partDist * sin(angle)   (x-component, positive = going right)
  //   dy = -partDist * cos(angle)  (y-component, negative = going up per step)
  // where angle = Math.acos(adj / hyp) and adj is the VERTICAL distance.
  // But we computed angle = acos(innerWidth/hyp) where innerWidth is HORIZONTAL.
  // Let's re-derive cleanly:
  //   sin(angle_from_vertical) = innerWidth / hyp
  //   cos(angle_from_vertical) = adj / hyp
  // FSA: angle = acos(adj / hyp)  — angle from vertical = angle between strand and the horizontal axis
  // Actually FSA defines: angle = Math.acos(adj/hyp) where adj is vertical distance.
  // Then dx = partDist * sin(angle), dy = -partDist * cos(angle).
  // Recompute:
  const angleFSA = Math.acos(adj / hyp); // angle from horizontal (adj is vertical leg, hyp is slant)
  const dx = partDist * Math.sin(angleFSA);
  const dy = -partDist * Math.cos(angleFSA);

  // Canvas width: x travels from 0 to strandParts*dx (one full pass of all HCs brings x back).
  // Add a margin for the miter half-width at each end.
  const miterMargin = (strandWidth / 2) / Math.cos(angleFSA) + strandWidth + 20;
  const canvasWidth = strandParts * dx + miterMargin * 2;

  const metrics: MandrelMetricsFSA = {
    strandWidth,
    gapWidth: 0,
    bightDist,
    partDist,
    angle: angleFSA,
    dx,
    dy,
    canvasWidth,
    canvasHeight,
  };

  // ── Build pieces for each strand ─────────────────────────────────────────
  const allPieces: MandrelPiece[][] = knot.strands.map((strand, strandIndex) => {
    const pieces: MandrelPiece[] = [];
    const { halfCycles, coding, sobre, parts } = strand;

    // Initial position for this strand.
    // Strand s starts at y offset = strandIndex * bightDist (interleaved slots).
    // x starts at the left margin.
    let startx = miterMargin;
    let starty = strandIndex * bightDist;

    halfCycles.forEach((hc, hcIndex) => {
      const goingRight = hcIndex % 2 === 0;

      // Emit crossing pieces (parts-1 of them per HC)
      for (let j = 0; j < parts - 1; j++) {
        const x = goingRight
          ? startx + (j + 1) * dx
          : startx - (j + 1) * dx;
        // y wraps around the canvas height (torus topology)
        const rawY = starty + (j + 1) * dy;
        const y = ((rawY % canvasHeight) + canvasHeight) % canvasHeight;

        const type: MandrelPiece['type'] = goingRight ? 'right' : 'left';

        // Over/under from coding:
        // FSA for going-right HC: read coding[j]
        //   over = (sobre && coding[j]=='\\') || (!sobre && coding[j]=='/')
        // FSA for going-left HC: read coding[parts-2-j] (reversed)
        //   over = (sobre && coding[p-2-j]=='\\') || (!sobre && coding[p-2-j]=='/')
        // Then flip for odd HCs (hcIndex % 2 !== 0).
        const codingIndex = goingRight ? j : parts - 2 - j;
        const ch = coding[codingIndex] ?? '\\';
        let over = (sobre && ch === '\\') || (!sobre && ch === '/');
        if (!goingRight) over = !over; // flip for odd (left-going) HCs

        const uo: 'O' | 'U' = over ? 'O' : 'U';

        pieces.push({ x, y, type, uo, strandIndex, hcIndex });
      }

      // Advance to the bight pin (miter piece)
      if (goingRight) {
        startx += parts * dx;
        const rawY = starty + parts * dy;
        starty = ((rawY % canvasHeight) + canvasHeight) % canvasHeight;
      } else {
        startx -= parts * dx;
        const rawY = starty + parts * dy;
        starty = ((rawY % canvasHeight) + canvasHeight) % canvasHeight;
      }

      const miterType: MandrelPiece['type'] = goingRight ? 'right_miter' : 'left_miter';
      pieces.push({ x: startx, y: starty, type: miterType, uo: null, strandIndex, hcIndex });
    });

    return pieces;
  });

  return { metrics, pieces: allPieces };
}
