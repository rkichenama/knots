import { HalfCycle } from './halfcycle';
import { Knot } from './knot';

export type Point = { x: number; y: number };

export type Segment = {
  halfCycleIndex: number;
  strandIndex: number;
  from: Point;
  to: Point;
  isEdge: boolean;
};

export type GridCrossing = {
  x: number;
  y: number;
  isOver: boolean; // true = NW-SE strand goes over NE-SW strand
};

// pin is 1-indexed bight number; unit = strandWidth + gapWidth
export function pinY(pin: number, unit: number): number {
  return (pin - 1) * 2 * unit + unit / 2;
}

export function pinX(edge: 'left' | 'right', width: number): number {
  return edge === 'left' ? 0 : width;
}

// Returns intersection point if two line segments intersect, null otherwise.
export function lineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
  const d1x = p2.x - p1.x,
    d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x,
    d2y = p4.y - p3.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-10) return null;

  const dx = p3.x - p1.x,
    dy = p3.y - p1.y;
  const t = (dx * d2y - dy * d2x) / denom;
  const u = (dx * d1y - dy * d1x) / denom;

  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: p1.x + t * d1x, y: p1.y + t * d1y };
}

// halfCycleIndex: index within the strand's halfCycles array
// strandIndex: which strand this belongs to
// unit: strandWidth + gapWidth
// width: canvas width
export function segmentFromHalfCycle(
  hc: HalfCycle,
  halfCycleIndex: number,
  strandIndex: number,
  unit: number,
  width: number
): Segment {
  const fromEdge: 'left' | 'right' = halfCycleIndex % 2 === 0 ? 'right' : 'left';
  const toEdge: 'left' | 'right' = fromEdge === 'right' ? 'left' : 'right';

  const from: Point = { x: pinX(fromEdge, width), y: pinY(hc.fromPin, unit) };
  const to: Point = { x: pinX(toEdge, width), y: pinY(hc.toPin, unit) };
  const isEdge = hc.fromPin === hc.toPin;

  return { halfCycleIndex, strandIndex, from, to, isEdge };
}

// Compute all crossing positions and over/under from knot coding.
// Returns (parts-1)*bights crossings on a regular grid.
// cellSize: pixels per grid cell; margin: pixels of padding for bight curves.
// Grid: col 0..(parts-2), row 0..(bights-1).
// Even rows (0,2,...): NW-SE strand goes right-to-left (fromRight).
// Odd rows (1,3,...):  NW-SE strand goes left-to-right (fromLeft).
// isOver: whether the NW-SE diagonal (\) goes over the NE-SW diagonal (/).
export function gridCrossings(knot: Knot, cellSize: number, margin: number): GridCrossing[] {
  const { parts, bights, coding, sobre } = knot;
  const crossings: GridCrossing[] = [];

  for (let row = 0; row < bights; row++) {
    const fromRight = row % 2 === 0;
    for (let col = 0; col < parts - 1; col++) {
      const cx = margin + col * cellSize + cellSize / 2;
      const cy = margin + row * cellSize + cellSize / 2;

      // coding[col] gives the strand direction at this column position.
      // '\' = backslash = NW-SE strand goes over when fromRight (casa).
      // sobre inverts the interpretation.
      const isBackslash = coding[col] === '\\';
      // In a right-traveling row, backslash = over; left-traveling row inverts.
      const isOver = fromRight ? isBackslash !== sobre : isBackslash === sobre;

      crossings.push({ x: cx, y: cy, isOver });
    }
  }

  return crossings;
}
