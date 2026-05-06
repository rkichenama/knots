# TileKnotDiagram — Path-Based Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken tile-grid canvas renderer with a path-based renderer that traces continuous strand paths through knot geometry, producing a correct visual diagram.

**Architecture:** Each strand in an `InterweavedKnot` is traced as a series of diagonal line segments and edge arcs derived from `halfCycles`. Strands are drawn to per-strand `OffscreenCanvas` instances; crossings are resolved by punching `destination-out` gaps at under-crossing points. All offscreen canvases are composited onto the main canvas.

**Tech Stack:** React, TypeScript, Canvas 2D API, `OffscreenCanvas`, styled-components (existing), Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/knotPath.ts` | Create | Pure functions: pin→pixel coords, half-cycle→canvas segment, crossing intersection math, crossing registry builder |
| `src/lib/knotPath.test.ts` | Create | Unit tests for all pure functions in knotPath.ts |
| `src/components/TileKnotDiagram.tsx` | Rewrite | React component: accepts `InterweavedKnot`, manages canvas lifecycle, calls rendering pipeline |
| `src/lib/knotTiles.ts` | Delete | Old tile approach — no other consumers |
| `src/lib/knotTiles.test.ts` | Delete | Tests for deleted file |

---

## Coordinate System (Reference)

```
Canvas width  = parts * (strandWidth + gapWidth)
Canvas height = bights * 2 * (strandWidth + gapWidth)

unit = strandWidth + gapWidth   // cell size

Left edge  x = 0
Right edge x = width

Pin i (0-indexed, top→bottom): y = i * unit + unit/2
Total pins per side: 2 * bights

Half-cycle index 0: fromPin=pins[0], toPin=pins[1], top→bottom (right edge → left edge)
Half-cycle index 1: fromPin=pins[1], toPin=pins[2], bottom→top (left edge → right edge)
...alternating edges per half-cycle index parity

Edge detection: half-cycle index % 2 === 0  → starts on right edge
                half-cycle index % 2 === 1  → starts on left edge
```

Pin numbers in `HalfCycle.fromPin`/`toPin` are 1-indexed bight numbers (1..bights).
Map to canvas y: `pinY(pin, unit) = (pin - 1) * 2 * unit + unit/2`

---

## Task 1: Delete old tile files

**Files:**
- Delete: `src/lib/knotTiles.ts`
- Delete: `src/lib/knotTiles.test.ts`

- [ ] **Step 1: Remove knotTiles.ts and its test**

```bash
git rm src/lib/knotTiles.ts src/lib/knotTiles.test.ts
```

- [ ] **Step 2: Remove import from TileKnotDiagram**

Open `src/components/TileKnotDiagram.tsx`. Remove:
```ts
import { knotToGrid, CellType } from '../lib/knotTiles';
```
Leave file otherwise broken for now — it will be fully rewritten in Task 3.

- [ ] **Step 3: Verify TypeScript still compiles (errors expected only in TileKnotDiagram)**

```bash
npx tsc --noEmit 2>&1 | grep -v TileKnotDiagram
```
Expected: no errors outside TileKnotDiagram.

- [ ] **Step 4: Commit**

```bash
git add src/components/TileKnotDiagram.tsx
git commit -m "refactor: remove knotTiles tile-grid approach"
```

---

## Task 2: Create knotPath.ts with coordinate and crossing math

**Files:**
- Create: `src/lib/knotPath.ts`
- Create: `src/lib/knotPath.test.ts`

### Types

```ts
export type Point = { x: number; y: number };

export type Segment = {
  halfCycleIndex: number;
  strandIndex: number;
  from: Point;
  to: Point;
  isEdge: boolean; // true = bight curve (fromPin === toPin on same edge)
};

export type CrossingPoint = {
  coord: Point;
  isOver: boolean; // true = this strand goes over at this crossing
  otherStrandIndex: number;
  otherHalfCycleIndex: number;
};

export type CrossingRegistry = Map<number, CrossingPoint[]>;
// key = halfCycleIndex (global, across all strands)
```

### Step-by-step

- [ ] **Step 1: Write failing tests for pinY**

Create `src/lib/knotPath.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { pinY, pinX, segmentFromHalfCycle, lineIntersection } from './knotPath';

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
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run src/lib/knotPath.test.ts
```
Expected: FAIL — `Cannot find module './knotPath'`

- [ ] **Step 3: Implement pinY and pinX**

Create `src/lib/knotPath.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify pinY/pinX pass**

```bash
npx vitest run src/lib/knotPath.test.ts
```
Expected: PASS (pinY and pinX describe blocks)

- [ ] **Step 5: Write failing tests for lineIntersection**

Append to `src/lib/knotPath.test.ts`:

```ts
describe('lineIntersection', () => {
  it('finds intersection of two crossing diagonals', () => {
    // / line: (0,100) → (100,0)
    // \ line: (0,0)   → (100,100)
    const pt = lineIntersection(
      { x: 0, y: 100 }, { x: 100, y: 0 },
      { x: 0, y: 0 },   { x: 100, y: 100 }
    );
    expect(pt).not.toBeNull();
    expect(pt!.x).toBeCloseTo(50);
    expect(pt!.y).toBeCloseTo(50);
  });

  it('returns null for parallel lines', () => {
    const pt = lineIntersection(
      { x: 0, y: 0 }, { x: 100, y: 100 },
      { x: 0, y: 10 }, { x: 100, y: 110 }
    );
    expect(pt).toBeNull();
  });

  it('returns null when lines do not intersect within segments', () => {
    // Both go same direction, no overlap
    const pt = lineIntersection(
      { x: 0, y: 0 }, { x: 10, y: 10 },
      { x: 20, y: 0 }, { x: 30, y: 10 }
    );
    expect(pt).toBeNull();
  });
});
```

- [ ] **Step 6: Run to verify failure**

```bash
npx vitest run src/lib/knotPath.test.ts
```
Expected: FAIL — `lineIntersection is not a function`

- [ ] **Step 7: Implement lineIntersection**

Append to `src/lib/knotPath.ts`:

```ts
// Returns intersection point if two line segments intersect, null otherwise.
export function lineIntersection(
  p1: Point, p2: Point,
  p3: Point, p4: Point
): Point | null {
  const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-10) return null; // parallel

  const dx = p3.x - p1.x, dy = p3.y - p1.y;
  const t = (dx * d2y - dy * d2x) / denom;
  const u = (dx * d1y - dy * d1x) / denom;

  if (t < 0 || t > 1 || u < 0 || u > 1) return null; // outside segments
  return { x: p1.x + t * d1x, y: p1.y + t * d1y };
}
```

- [ ] **Step 8: Run tests to verify lineIntersection passes**

```bash
npx vitest run src/lib/knotPath.test.ts
```
Expected: all tests PASS

- [ ] **Step 9: Write failing tests for segmentFromHalfCycle**

Append to `src/lib/knotPath.test.ts`:

```ts
import { InterweavedKnot } from './interweaved-knot';

describe('segmentFromHalfCycle', () => {
  it('half-cycle index 0 (even) starts on right edge', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [] });
    const strand = knot.strands[0];
    const unit = 20;
    const width = knot.parts * unit;
    const seg = segmentFromHalfCycle(strand.halfCycles[0], 0, 0, unit, width);
    expect(seg.from.x).toBe(width); // right edge
  });

  it('half-cycle index 1 (odd) starts on left edge', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [] });
    const strand = knot.strands[0];
    const unit = 20;
    const width = knot.parts * unit;
    const seg = segmentFromHalfCycle(strand.halfCycles[1], 1, 0, unit, width);
    expect(seg.from.x).toBe(0); // left edge
  });
});
```

- [ ] **Step 10: Run to verify failure**

```bash
npx vitest run src/lib/knotPath.test.ts
```
Expected: FAIL — `segmentFromHalfCycle is not a function`

- [ ] **Step 11: Implement segmentFromHalfCycle**

Append to `src/lib/knotPath.ts`:

```ts
import { HalfCycle } from './halfcycle';

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
  // Even index starts on right edge (top→bottom direction), odd on left edge
  const fromEdge: 'left' | 'right' = halfCycleIndex % 2 === 0 ? 'right' : 'left';
  const toEdge: 'left' | 'right' = fromEdge === 'right' ? 'left' : 'right';

  const from: Point = { x: pinX(fromEdge, width), y: pinY(hc.fromPin, unit) };
  const to: Point   = { x: pinX(toEdge, width),   y: pinY(hc.toPin, unit) };
  const isEdge = hc.fromPin === hc.toPin; // curve cell — same pin number, turns back

  return { halfCycleIndex, strandIndex, from, to, isEdge };
}
```

- [ ] **Step 12: Run all tests**

```bash
npx vitest run src/lib/knotPath.test.ts
```
Expected: all PASS

- [ ] **Step 13: Write failing tests for buildCrossingRegistry**

Append to `src/lib/knotPath.test.ts`:

```ts
import { buildCrossingRegistry } from './knotPath';

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
    const registry = buildCrossingRegistry(knot.strands, segments, unit, width);
    // A 5-part 4-bight knot has interior crossings — registry should not be empty
    expect(registry.size).toBeGreaterThan(0);
  });

  it('crossing point isOver matches halfCycle runs', () => {
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [] });
    const unit = 20;
    const width = knot.parts * unit;
    const segments: Segment[] = [];
    knot.strands.forEach((strand, si) => {
      strand.halfCycles.forEach((hc, hi) => {
        segments.push(segmentFromHalfCycle(hc, hi, si, unit, width));
      });
    });
    const registry = buildCrossingRegistry(knot.strands, segments, unit, width);
    // For every entry, the number of crossings must match the halfCycle's runs length
    registry.forEach((crossings, hcIndex) => {
      const seg = segments[hcIndex];
      const hc = knot.strands[seg.strandIndex].halfCycles[seg.halfCycleIndex];
      expect(crossings.length).toBe(hc.runs.length);
    });
  });
});
```

- [ ] **Step 14: Run to verify failure**

```bash
npx vitest run src/lib/knotPath.test.ts
```
Expected: FAIL — `buildCrossingRegistry is not a function`

- [ ] **Step 15: Implement buildCrossingRegistry**

Append to `src/lib/knotPath.ts`:

```ts
import { Knot } from './knot';

// Build a registry of crossing points for all non-edge half-cycles.
// segments must be indexed to match: segments[globalIndex] where globalIndex
// = strandIndex * strand.halfCycles.length + halfCycleIndex (flattened).
// Returns map keyed by segment index in the segments array.
export function buildCrossingRegistry(
  strands: Knot[],
  segments: Segment[],
  unit: number,
  width: number
): CrossingRegistry {
  const registry: CrossingRegistry = new Map();

  // For each pair of non-edge segments, find intersections
  for (let i = 0; i < segments.length; i++) {
    const a = segments[i];
    if (a.isEdge) continue;

    for (let j = i + 1; j < segments.length; j++) {
      const b = segments[j];
      if (b.isEdge) continue;

      const pt = lineIntersection(a.from, a.to, b.from, b.to);
      if (!pt) continue;

      // Determine which is over at this crossing using runs arrays
      // Sort crossings along segment a by parameter t from a.from
      const aHc = strands[a.strandIndex].halfCycles[a.halfCycleIndex];
      const bHc = strands[b.strandIndex].halfCycles[b.halfCycleIndex];

      // Count how many crossings segment a has before this one (by x position along segment)
      const aExisting = registry.get(i) ?? [];
      const bExisting = registry.get(j) ?? [];

      const aCrossingIdx = aExisting.length; // nth crossing on a
      const bCrossingIdx = bExisting.length; // nth crossing on b

      const aIsOver = aCrossingIdx < aHc.runs.length
        ? aHc.runs[aCrossingIdx] === 'O'
        : false;

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
```

- [ ] **Step 16: Run all tests**

```bash
npx vitest run src/lib/knotPath.test.ts
```
Expected: all PASS

- [ ] **Step 17: Commit**

```bash
git add src/lib/knotPath.ts src/lib/knotPath.test.ts
git commit -m "feat: add knotPath coordinate and crossing math utilities"
```

---

## Task 3: Rewrite TileKnotDiagram component

**Files:**
- Rewrite: `src/components/TileKnotDiagram.tsx`

- [ ] **Step 1: Write new component skeleton**

Replace entire contents of `src/components/TileKnotDiagram.tsx`:

```tsx
import * as React from 'react';
import styled from 'styled-components';
import { InterweavedKnot } from '../lib/interweaved-knot';
import {
  segmentFromHalfCycle,
  buildCrossingRegistry,
  pinY,
  pinX,
  Segment,
  CrossingRegistry,
} from '../lib/knotPath';

type Props = {
  knot: InterweavedKnot;
  strandWidth: number;
  gapWidth: number;
};

const ResizeContainer = styled.div`
  overflow: hidden;
  resize: auto;
`;

export const TileKnotDiagram: React.FC<Props> = ({ knot, strandWidth, gapWidth }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const unit = strandWidth + gapWidth;
    const width  = knot.parts * unit;
    const height = knot.bights * 2 * unit;

    canvas.width  = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, width, height);

    render(ctx, knot, strandWidth, gapWidth, unit, width, height);
  }, [knot, strandWidth, gapWidth]);

  return (
    <ResizeContainer>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </ResizeContainer>
  );
};
```

- [ ] **Step 2: Add render function — build segments and registry**

Append to `src/components/TileKnotDiagram.tsx`:

```tsx
function render(
  ctx: CanvasRenderingContext2D,
  knot: InterweavedKnot,
  strandWidth: number,
  gapWidth: number,
  unit: number,
  width: number,
  height: number
) {
  // Build flat segment list across all strands
  const segments: Segment[] = [];
  knot.strands.forEach((strand, si) => {
    strand.halfCycles.forEach((hc, hi) => {
      segments.push(segmentFromHalfCycle(hc, hi, si, unit, width));
    });
  });

  const registry = buildCrossingRegistry(knot.strands, segments, unit, width);

  // Create one OffscreenCanvas per strand
  const offscreens = knot.strands.map(() => {
    const oc = new OffscreenCanvas(width, height);
    return oc;
  });

  // Draw each strand to its offscreen canvas
  knot.strands.forEach((strand, si) => {
    const oc = offscreens[si];
    const octx = oc.getContext('2d') as OffscreenCanvasRenderingContext2D;
    const color = knot.strandColors[si];

    strand.halfCycles.forEach((hc, hi) => {
      const segIndex = segments.findIndex(
        s => s.strandIndex === si && s.halfCycleIndex === hi
      );
      const seg = segments[segIndex];

      if (seg.isEdge) {
        drawCurve(octx, seg, unit, strandWidth, gapWidth, color);
      } else {
        drawDiagonal(octx, seg, strandWidth, color);
      }
    });

    // Punch under-crossing gaps on this strand's offscreen canvas
    // For each segment where this strand is under, the over-strand punches
    // the gap. We do it here: iterate all segments of this strand, check registry.
    strand.halfCycles.forEach((_hc, hi) => {
      const segIndex = segments.findIndex(
        s => s.strandIndex === si && s.halfCycleIndex === hi
      );
      const crossings = registry.get(segIndex) ?? [];
      crossings.forEach(cp => {
        if (!cp.isOver) {
          punchGap(octx, cp.coord, gapWidth);
        }
      });
    });
  });

  // Composite all offscreen canvases onto main canvas
  knot.strands.forEach((_strand, si) => {
    ctx.drawImage(offscreens[si], 0, 0);
  });
}
```

- [ ] **Step 3: Add drawDiagonal function**

Append to `src/components/TileKnotDiagram.tsx`:

```tsx
function drawDiagonal(
  ctx: OffscreenCanvasRenderingContext2D,
  seg: Segment,
  strandWidth: number,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = strandWidth;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(seg.from.x, seg.from.y);
  ctx.lineTo(seg.to.x, seg.to.y);
  ctx.stroke();
  ctx.restore();
}
```

- [ ] **Step 4: Add drawCurve function**

Append to `src/components/TileKnotDiagram.tsx`:

```tsx
function drawCurve(
  ctx: OffscreenCanvasRenderingContext2D,
  seg: Segment,
  unit: number,
  strandWidth: number,
  gapWidth: number,
  color: string
) {
  // Edge curve: two parallel arcs connecting fromPin and toPin on same edge.
  // Arc center is midpoint between the two pins at the edge x.
  // fromPin and toPin are adjacent: toPin = fromPin ± 1
  const arcRadius = unit; // distance between adjacent pins = 2 * unit; radius = unit
  const innerRadius = arcRadius - gapWidth / 2;
  const outerRadius = arcRadius + gapWidth / 2;

  const cx = seg.from.x; // left or right edge x
  const cy = (seg.from.y + seg.to.y) / 2; // midpoint y between the two pins

  // Determine arc direction: left edge curves right, right edge curves left
  const isLeft = cx === 0;
  const startAngle = isLeft ? -Math.PI / 2 : Math.PI / 2;  // top of arc
  const endAngle   = isLeft ? Math.PI / 2  : -Math.PI / 2; // bottom of arc
  const anticlockwise = !isLeft;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = strandWidth / 3; // thinner for parallel arcs
  ctx.lineCap = 'round';

  // Inner arc
  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius, startAngle, endAngle, anticlockwise);
  ctx.stroke();

  // Outer arc
  ctx.beginPath();
  ctx.arc(cx, cy, outerRadius, startAngle, endAngle, anticlockwise);
  ctx.stroke();

  ctx.restore();
}
```

- [ ] **Step 5: Add punchGap function**

Append to `src/components/TileKnotDiagram.tsx`:

```tsx
function punchGap(
  ctx: OffscreenCanvasRenderingContext2D,
  coord: { x: number; y: number },
  gapWidth: number
) {
  const half = gapWidth;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillRect(coord.x - half, coord.y - half, half * 2, half * 2);
  ctx.restore();
}
```

- [ ] **Step 6: Verify TypeScript compiles with no errors**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/components/TileKnotDiagram.tsx
git commit -m "feat: rewrite TileKnotDiagram with path-based strand rendering"
```

---

## Task 4: Update component consumers

**Files:**
- Modify: whichever files import `TileKnotDiagram` and pass `knot: Knot` — must switch to `InterweavedKnot` and add `strandWidth`/`gapWidth` props.

- [ ] **Step 1: Find all consumers of TileKnotDiagram**

```bash
grep -r "TileKnotDiagram" src/ --include="*.tsx" --include="*.ts" -l
```

- [ ] **Step 2: Update each consumer**

For each file found, replace:
```tsx
// Before (example)
import { TileKnotDiagram } from '../components/TileKnotDiagram';
// ...
<TileKnotDiagram knot={knot} color="#e63946" cellSize={40} />
```
With:
```tsx
import { TileKnotDiagram } from '../components/TileKnotDiagram';
import { InterweavedKnot } from '../lib/interweaved-knot';
// ...
const interweavedKnot = new InterweavedKnot({
  parts: knot.parts,
  bights: knot.bights,
  strands: [{ color: '#e63946' }],
});
<TileKnotDiagram knot={interweavedKnot} strandWidth={14} gapWidth={6} />
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add -p
git commit -m "feat: update TileKnotDiagram consumers to InterweavedKnot API"
```

---

## Task 5: Visual verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Open knot diagram page in browser**

Navigate to the knot diagram page. Set knot to `parts=7, bights=6`.

- [ ] **Step 3: Verify against reference image**

Compare rendered canvas to `docs/6bx7l.jpg`:
- Diagonal strands run between left and right edges
- Correct number of crossing points
- Over-strand is unbroken; under-strand has a clean rectangular gap at each crossing
- Left/right edges show two parallel arcs curving back

- [ ] **Step 4: Verify configurable sizing**

Temporarily change `strandWidth` and `gapWidth` props to confirm canvas resizes and proportions update correctly.

---

## Task 6: Run full test suite

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```
Expected: all tests pass, no regressions

- [ ] **Step 2: Final commit if any fixups needed**

```bash
git add -p
git commit -m "fix: address test suite issues after TileKnotDiagram rewrite"
```

---

## Self-Review Notes

- `buildCrossingRegistry` uses `segments.findIndex` per half-cycle in the render loop — O(n²). Acceptable for knot sizes in scope; flag for optimization if performance issues arise with large knots.
- `drawCurve` uses `strandWidth / 3` for arc stroke width — this is an approximation. May need visual tuning during Task 5 verification.
- `OffscreenCanvas` is not available in all environments (e.g., some test runners). Tests in `knotPath.test.ts` are pure math — no canvas. The component itself is not unit-tested (visual output only).
- The crossing registry assumes crossings are ordered by traversal along the segment. The current implementation orders by discovery (first intersection found = first run entry). This matches knot math only if intersections are found in the correct spatial order. **If crossings appear wrong visually, sort `aExisting`/`bExisting` by parameter `t` along the segment before indexing into `runs`.**
