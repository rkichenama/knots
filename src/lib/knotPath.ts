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

export type CrossingPoint = {
  coord: Point;
  isOver: boolean;
  otherStrandIndex: number;
  otherHalfCycleIndex: number;
};

export type CrossingRegistry = Map<number, CrossingPoint[]>;

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

// Build a registry of crossing points for all non-edge half-cycles.
// Returns map keyed by index in the segments array.
export function buildCrossingRegistry(strands: Knot[], segments: Segment[]): CrossingRegistry {
  const registry: CrossingRegistry = new Map();

  for (let i = 0; i < segments.length; i++) {
    const a = segments[i];
    if (a.isEdge) continue;

    for (let j = i + 1; j < segments.length; j++) {
      const b = segments[j];
      if (b.isEdge) continue;

      const pt = lineIntersection(a.from, a.to, b.from, b.to);
      if (!pt) continue;

      const aHc = strands[a.strandIndex].halfCycles[a.halfCycleIndex];

      const aExisting = registry.get(i) ?? [];
      const bExisting = registry.get(j) ?? [];

      const aCrossingIdx = aExisting.length;
      const aIsOver = aCrossingIdx < aHc.runs.length ? aHc.runs[aCrossingIdx] === 'O' : false;

      aExisting.push({
        coord: pt,
        isOver: aIsOver,
        otherStrandIndex: b.strandIndex,
        otherHalfCycleIndex: b.halfCycleIndex,
      });
      bExisting.push({
        coord: pt,
        isOver: !aIsOver,
        otherStrandIndex: a.strandIndex,
        otherHalfCycleIndex: a.halfCycleIndex,
      });

      registry.set(i, aExisting);
      registry.set(j, bExisting);
    }
  }

  return registry;
}
