# Unrolled Mandrel Diagram Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `src/lib/unrolled-mandrel.ts` (geometry) + `src/components/UnrolledMandrelDiagram.tsx` (canvas renderer) that draws a colored-ribbon interweaved knot on an unrolled mandrel, then wire it into `KnotDisplay` and `InterweavedDisplay`.

**Architecture:** Geometry lives in a pure lib (`unrolled-mandrel.ts`) that computes pin positions, half-cycle diagonal lines, and crossing points from an `InterweavedKnot`. The canvas component does two-pass offscreen rendering — backslash layer and slash layer — with `destination-out` gap punching at crossings. Bight arcs wrap around pins as semicircular strokes. All sizing derives from `strandWidth` + `gapWidth` + knot parameters.

**Tech Stack:** React, TypeScript, HTML Canvas API, Vitest (tests), styled-components, `@preact/signals-react` (existing signals pattern)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/unrolled-mandrel.ts` | Create | Pin positions, HC lines, crossing detection |
| `src/lib/unrolled-mandrel.test.ts` | Create | Unit tests for geometry lib |
| `src/components/UnrolledMandrelDiagram.tsx` | Create | Canvas renderer, 2-pass compositing |
| `src/components/KnotDisplay.tsx` | Modify | Add `UnrolledMandrelDiagram` below existing |
| `src/components/InterweavedDisplay.tsx` | Modify | Add `UnrolledMandrelDiagram` in Overall tab |
| `docs/buildsummary.md` | Create | What was built, key decisions, how to use |

---

## Task 1: Geometry lib — types and pin positions

**Files:**
- Create: `src/lib/unrolled-mandrel.ts`
- Create: `src/lib/unrolled-mandrel.test.ts`

- [ ] **Step 1: Write failing tests for `getPinPositions`**

Create `src/lib/unrolled-mandrel.test.ts`:

```typescript
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
    // first right pin should be half a cell above first left pin
    expect(right[0].y).toBeCloseTo(left[0].y - m.cellSize / 2);
  });

  it('even parts: right pins same Y as left pins', () => {
    const knot = new InterweavedKnot({ parts: 4, bights: 6, strands: [{}, {}] });
    const m = makeMetrics();
    const { left, right } = getPinPositions(knot, m);
    expect(right[0].y).toBeCloseTo(left[0].y);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (module not found)**

```
pnpm test -- unrolled-mandrel
```

Expected: `Cannot find module './unrolled-mandrel'`

- [ ] **Step 3: Create `src/lib/unrolled-mandrel.ts` with types and `getPinPositions`**

```typescript
import { InterweavedKnot } from './interweaved-knot';
import { Point } from './tying-logic';

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
  pinNumber: number; // 1-indexed within that strand's bight sequence
};

export type MandrelLine = {
  from: MandrelPin;
  to: MandrelPin;
  strandIndex: number;
  isBackslash: boolean; // true = top-left→bottom-right (going right & down)
  isFreeRun: boolean;
};

export type MandrelCrossing = {
  x: number;
  y: number;
  backslashLine: MandrelLine;
  slashLine: MandrelLine;
  isBackslashOver: boolean;
};

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

export function getPinPositions(
  knot: InterweavedKnot,
  m: MandrelMetrics
): { left: MandrelPin[]; right: MandrelPin[] } {
  const totalPins = knot.numStrands * knot.bights;
  const mandrelWidth = (knot.parts - 1) * m.cellSize;
  const isOddParts = knot.parts % 2 !== 0;

  const left: MandrelPin[] = [];
  const right: MandrelPin[] = [];

  for (let p = 0; p < totalPins; p++) {
    const strandIndex = p % knot.numStrands;
    // pinNumber is the bight index within this strand (0-indexed)
    const pinNumber = Math.floor(p / knot.numStrands);
    const y = m.margin + p * m.cellSize + m.cellSize / 2;

    left.push({ x: m.margin, y, strandIndex, pinNumber });
    right.push({
      x: m.margin + mandrelWidth,
      y: isOddParts ? y - m.cellSize / 2 : y,
      strandIndex,
      pinNumber,
    });
  }

  return { left, right };
}
```

- [ ] **Step 4: Run tests — expect PASS**

```
pnpm test -- unrolled-mandrel
```

Expected: all `getPinPositions` tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/unrolled-mandrel.ts src/lib/unrolled-mandrel.test.ts
git commit -m "feat(lib): add unrolled-mandrel geometry — MandrelMetrics types and getPinPositions"
```

---

## Task 2: Geometry lib — half-cycle lines

**Files:**
- Modify: `src/lib/unrolled-mandrel.ts`
- Modify: `src/lib/unrolled-mandrel.test.ts`

- [ ] **Step 1: Add failing tests for `getHalfCycleLines`**

Append to `src/lib/unrolled-mandrel.test.ts`:

```typescript
import { getHalfCycleLines } from './unrolled-mandrel';

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
    // 5P×4B casa: first HC is free run (fromPin=1, toPin=next, no runs)
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const m = makeMetrics();
    const lines = getHalfCycleLines(knot, m);
    const strand = knot.strands[0];
    const firstHcIsFreeRun = strand.halfCycles[0].runs.length === 0;
    if (firstHcIsFreeRun) {
      expect(lines[0].isFreeRun).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (`getHalfCycleLines` not exported)**

```
pnpm test -- unrolled-mandrel
```

Expected: `getHalfCycleLines is not a function` or similar.

- [ ] **Step 3: Implement `getHalfCycleLines` in `src/lib/unrolled-mandrel.ts`**

Add after `getPinPositions`:

```typescript
export function getHalfCycleLines(
  knot: InterweavedKnot,
  m: MandrelMetrics
): MandrelLine[] {
  const { left, right } = getPinPositions(knot, m);
  const lines: MandrelLine[] = [];

  knot.strands.forEach((strand, strandIndex) => {
    // Build a lookup: pinNumber (1-indexed bight) → MandrelPin for this strand
    const leftPins = left.filter(p => p.strandIndex === strandIndex);
    const rightPins = right.filter(p => p.strandIndex === strandIndex);

    // pin arrays are indexed by bight (0-indexed), pinNumber from halfCycle is 1-indexed
    const leftPin = (n: number): MandrelPin => leftPins[n - 1] ?? leftPins[0];
    const rightPin = (n: number): MandrelPin => rightPins[n - 1] ?? rightPins[0];

    strand.halfCycles.forEach((hc, hcIndex) => {
      const goingRight = hcIndex % 2 === 0; // HC 0 starts left, goes right
      const from = goingRight ? leftPin(hc.fromPin) : rightPin(hc.fromPin);
      const to = goingRight ? rightPin(hc.toPin) : leftPin(hc.toPin);
      const isFreeRun = hc.runs.length === 0;

      lines.push({
        from,
        to,
        strandIndex,
        isBackslash: to.y > from.y,
        isFreeRun,
      });
    });
  });

  return lines;
}
```

- [ ] **Step 4: Run tests — expect PASS**

```
pnpm test -- unrolled-mandrel
```

Expected: all `getHalfCycleLines` tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/unrolled-mandrel.ts src/lib/unrolled-mandrel.test.ts
git commit -m "feat(lib): add getHalfCycleLines to unrolled-mandrel geometry"
```

---

## Task 3: Geometry lib — crossing detection

**Files:**
- Modify: `src/lib/unrolled-mandrel.ts`
- Modify: `src/lib/unrolled-mandrel.test.ts`

- [ ] **Step 1: Add failing tests for `getCrossings`**

Append to `src/lib/unrolled-mandrel.test.ts`:

```typescript
import { getCrossings } from './unrolled-mandrel';

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
    // A knot where all HCs are free-run would have no crossings.
    // We verify that free-run lines do not produce crossings.
    const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
    const m = makeMetrics();
    const lines = getHalfCycleLines(knot, m);
    const freeRunLines = lines.filter(l => l.isFreeRun);
    const crossings = getCrossings(lines, knot, m);
    // None of the crossings should involve a free-run line
    for (const c of crossings) {
      expect(c.backslashLine.isFreeRun).toBe(false);
      expect(c.slashLine.isFreeRun).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```
pnpm test -- unrolled-mandrel
```

Expected: `getCrossings is not a function`

- [ ] **Step 3: Implement `getCrossings` in `src/lib/unrolled-mandrel.ts`**

Add import at top of file:

```typescript
import { lineIntersection } from './tying-logic';
```

Add function after `getHalfCycleLines`:

```typescript
export function getCrossings(
  lines: MandrelLine[],
  knot: InterweavedKnot,
  m: MandrelMetrics
): MandrelCrossing[] {
  const mandrelWidth = (knot.parts - 1) * m.cellSize;
  const crossings: MandrelCrossing[] = [];

  const backslashLines = lines.filter(l => l.isBackslash && !l.isFreeRun);
  const slashLines = lines.filter(l => !l.isBackslash && !l.isFreeRun);

  for (const bl of backslashLines) {
    for (const sl of slashLines) {
      const pt = lineIntersection(bl.from, bl.to, sl.from, sl.to);
      if (!pt) continue;

      // Exclude crossings at or outside mandrel edges
      if (pt.x <= m.margin + 1 || pt.x >= m.margin + mandrelWidth - 1) continue;

      // Determine over/under from strand coding at crossing column
      const col = Math.floor((pt.x - m.margin) / m.cellSize);
      // Use the backslash line's strand for coding lookup
      const strand = knot.strands[bl.strandIndex];
      if (col < 0 || col >= strand.coding.length) continue;

      const isBackslashOver = (strand.coding[col] === '\\') !== strand.sobre;

      crossings.push({
        x: pt.x,
        y: pt.y,
        backslashLine: bl,
        slashLine: sl,
        isBackslashOver,
      });
    }
  }

  return crossings;
}
```

- [ ] **Step 4: Run tests — expect PASS**

```
pnpm test -- unrolled-mandrel
```

Expected: all geometry tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/unrolled-mandrel.ts src/lib/unrolled-mandrel.test.ts
git commit -m "feat(lib): add getCrossings to unrolled-mandrel geometry"
```

---

## Task 4: Canvas component — scaffold and sizing

**Files:**
- Create: `src/components/UnrolledMandrelDiagram.tsx`

- [ ] **Step 1: Create the component with correct canvas sizing**

Create `src/components/UnrolledMandrelDiagram.tsx`:

```typescript
import * as React from 'react';
import styled from 'styled-components';
import { InterweavedKnot } from '../lib/interweaved-knot';
import {
  makeMandrelMetrics,
  getPinPositions,
  getHalfCycleLines,
  getCrossings,
  MandrelMetrics,
  MandrelLine,
  MandrelCrossing,
  MandrelPin,
} from '../lib/unrolled-mandrel';

type Props = {
  knot: InterweavedKnot;
  strandWidth?: number;
  gapWidth?: number;
};

const Container = styled.div`
  position: relative;
  border: 1px solid #ccc;
  background: #fff;
  overflow: hidden;
  resize: both;
`;

const Canvas = styled.canvas`
  display: block;
`;

export const UnrolledMandrelDiagram: React.FC<Props> = ({
  knot,
  strandWidth = 12,
  gapWidth = 4,
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const m = makeMandrelMetrics(strandWidth, gapWidth);
    const totalPins = knot.numStrands * knot.bights;
    const mandrelWidth = (knot.parts - 1) * m.cellSize;
    const canvasWidth = mandrelWidth + 2 * m.margin;
    const canvasHeight = totalPins * m.cellSize + 2 * m.margin;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw placeholder grid lines so we can verify sizing
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    for (let p = 0; p < totalPins; p++) {
      const y = m.margin + p * m.cellSize + m.cellSize / 2;
      ctx.beginPath();
      ctx.moveTo(m.margin, y);
      ctx.lineTo(m.margin + mandrelWidth, y);
      ctx.stroke();
    }

  }, [knot, strandWidth, gapWidth]);

  return (
    <div>
      <h4>Unrolled Mandrel</h4>
      <Container>
        <Canvas ref={canvasRef} />
      </Container>
    </div>
  );
};
```

- [ ] **Step 2: Wire into `KnotDisplay.tsx` to verify it renders**

Open `src/components/KnotDisplay.tsx`. Add import and component:

```typescript
import { UnrolledMandrelDiagram } from './UnrolledMandrelDiagram';
```

Add inside the `<div className='grid grid-cols-2'>`, after `<KnotGrid />`:

```tsx
<div className='col-span-2'>
  <UnrolledMandrelDiagram knot={interweaved} />
</div>
```

- [ ] **Step 3: Start dev server and verify canvas renders with correct dimensions**

```
pnpm dev
```

Open browser to `http://localhost:5173`. Set a knot (e.g. 5P×4B). Verify:
- "Unrolled Mandrel" heading appears below KnotGrid
- Canvas is visible with light grey background
- Horizontal guide lines appear (one per pin)

- [ ] **Step 4: Commit**

```bash
git add src/components/UnrolledMandrelDiagram.tsx src/components/KnotDisplay.tsx
git commit -m "feat(ui): scaffold UnrolledMandrelDiagram with correct canvas sizing"
```

---

## Task 5: Canvas component — draw strands (two-pass offscreen)

**Files:**
- Modify: `src/components/UnrolledMandrelDiagram.tsx`

- [ ] **Step 1: Replace placeholder with two-pass strand rendering**

Replace the entire `useEffect` body in `UnrolledMandrelDiagram.tsx` with:

```typescript
React.useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const m = makeMandrelMetrics(strandWidth, gapWidth);
  const totalPins = knot.numStrands * knot.bights;
  const mandrelWidth = (knot.parts - 1) * m.cellSize;
  const canvasWidth = mandrelWidth + 2 * m.margin;
  const canvasHeight = totalPins * m.cellSize + 2 * m.margin;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const lines = getHalfCycleLines(knot, m);
  const crossings = getCrossings(lines, knot, m);

  // Create two offscreen canvases: backslash layer and slash layer
  const bsCanvas = document.createElement('canvas');
  bsCanvas.width = canvasWidth;
  bsCanvas.height = canvasHeight;
  const bsCtx = bsCanvas.getContext('2d')!;

  const slCanvas = document.createElement('canvas');
  slCanvas.width = canvasWidth;
  slCanvas.height = canvasHeight;
  const slCtx = slCanvas.getContext('2d')!;

  // Helper: draw one line segment (outline pass then color pass)
  const drawLine = (offCtx: CanvasRenderingContext2D, line: MandrelLine, color: string) => {
    const arcR = m.pinRadius + m.strandWidth / 2;

    // Compute tangent points where diagonal meets the bight arc
    // For a left pin: arc center = from, arc from 210°→330° (right-going HC)
    // For a right pin: arc center = to, arc from 150°→30° (right-going HC)
    // Tangent angle for a \-slope line at 30°: line goes at atan2(dy, dx)
    const dx = line.to.x - line.from.x;
    const dy = line.to.y - line.from.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / len;
    const uy = dy / len;

    // Start of line: move inward from pin center by arc radius
    const startX = line.from.x + ux * arcR;
    const startY = line.from.y + uy * arcR;
    // End of line: move inward from destination pin center by arc radius
    const endX = line.to.x - ux * arcR;
    const endY = line.to.y - uy * arcR;

    // Outline pass (black, wider)
    offCtx.beginPath();
    offCtx.strokeStyle = '#000';
    offCtx.lineWidth = m.strandWidth + m.outlineWidth * 2;
    offCtx.lineCap = 'butt';
    offCtx.moveTo(startX, startY);
    offCtx.lineTo(endX, endY);
    offCtx.stroke();

    // Color pass
    offCtx.beginPath();
    offCtx.strokeStyle = color;
    offCtx.lineWidth = m.strandWidth;
    offCtx.lineCap = 'butt';
    offCtx.moveTo(startX, startY);
    offCtx.lineTo(endX, endY);
    offCtx.stroke();
  };

  // Draw all lines to appropriate offscreen canvas
  lines.forEach(line => {
    const color = knot.strandColors[line.strandIndex];
    const offCtx = line.isBackslash ? bsCtx : slCtx;
    drawLine(offCtx, line, color);
  });

  // Gap punch: on the "under" layer, cut a gap at each crossing
  crossings.forEach(cp => {
    const underCtx = cp.isBackslashOver ? slCtx : bsCtx;
    const overLine = cp.isBackslashOver ? cp.backslashLine : cp.slashLine;

    // Perpendicular to the over-line direction
    const dx = overLine.to.x - overLine.from.x;
    const dy = overLine.to.y - overLine.from.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / len; // perpendicular
    const ny = dx / len;
    const gapHalf = (m.strandWidth / 2) + m.gapWidth;
    const punchW = m.strandWidth + m.outlineWidth * 2 + 2;

    underCtx.save();
    underCtx.globalCompositeOperation = 'destination-out';
    underCtx.translate(cp.x, cp.y);
    // Rotate to align with over-line direction
    underCtx.rotate(Math.atan2(dy, dx));
    underCtx.fillRect(-gapHalf, -punchW / 2, gapHalf * 2, punchW);
    underCtx.restore();
  });

  // Composite: background, then bs layer, then sl layer
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.drawImage(bsCanvas, 0, 0);
  ctx.drawImage(slCanvas, 0, 0);

}, [knot, strandWidth, gapWidth]);
```

- [ ] **Step 2: Check in browser**

```
pnpm dev
```

Verify in browser (5P×4B):
- Colored diagonal strands visible on canvas
- Strands have black outline + colored interior
- Gaps appear at strand crossings (one strand breaks where the other passes over)

- [ ] **Step 3: Commit**

```bash
git add src/components/UnrolledMandrelDiagram.tsx
git commit -m "feat(ui): add two-pass strand rendering with gap punching to UnrolledMandrelDiagram"
```

---

## Task 6: Canvas component — bight arcs

**Files:**
- Modify: `src/components/UnrolledMandrelDiagram.tsx`

- [ ] **Step 1: Add bight arc drawing after compositing**

After `ctx.drawImage(slCanvas, 0, 0);`, add bight arc rendering. Still inside the `useEffect` body:

```typescript
// Draw bight arcs: strand wraps around each pin
const { left, right } = getPinPositions(knot, m);
const arcR = m.pinRadius + m.strandWidth / 2;

const drawArc = (pin: MandrelPin, isLeftSide: boolean) => {
  const color = knot.strandColors[pin.strandIndex];

  // Outline arc (black, wider)
  ctx.beginPath();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = m.strandWidth + m.outlineWidth * 2;
  ctx.lineCap = 'round';
  if (isLeftSide) {
    // Left pin: arc from 210° to 330° (counterclockwise = anticlockwise)
    ctx.arc(pin.x, pin.y, arcR, (210 * Math.PI) / 180, (330 * Math.PI) / 180, false);
  } else {
    // Right pin: arc from 150° to 30° counterclockwise
    // Going counterclockwise from 150° to 30° means anticlockwise=true
    ctx.arc(pin.x, pin.y, arcR, (150 * Math.PI) / 180, (30 * Math.PI) / 180, true);
  }
  ctx.stroke();

  // Color arc
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = m.strandWidth;
  ctx.lineCap = 'round';
  if (isLeftSide) {
    ctx.arc(pin.x, pin.y, arcR, (210 * Math.PI) / 180, (330 * Math.PI) / 180, false);
  } else {
    ctx.arc(pin.x, pin.y, arcR, (150 * Math.PI) / 180, (30 * Math.PI) / 180, true);
  }
  ctx.stroke();
};

left.forEach(pin => drawArc(pin, true));
right.forEach(pin => drawArc(pin, false));

// Draw pin dots on top
left.forEach(pin => {
  ctx.beginPath();
  ctx.fillStyle = '#333';
  ctx.arc(pin.x, pin.y, m.pinRadius, 0, Math.PI * 2);
  ctx.fill();
});
right.forEach(pin => {
  ctx.beginPath();
  ctx.fillStyle = '#333';
  ctx.arc(pin.x, pin.y, m.pinRadius, 0, Math.PI * 2);
  ctx.fill();
});
```

- [ ] **Step 2: Check in browser**

```
pnpm dev
```

Verify:
- Semicircular arcs appear at left and right edges, wrapping around each pin
- Arc color matches strand color with black outline
- Arcs connect smoothly to the diagonal lines

- [ ] **Step 3: Commit**

```bash
git add src/components/UnrolledMandrelDiagram.tsx
git commit -m "feat(ui): add bight arcs to UnrolledMandrelDiagram"
```

---

## Task 7: Canvas component — pin labels

**Files:**
- Modify: `src/components/UnrolledMandrelDiagram.tsx`

- [ ] **Step 1: Add pin number labels**

After pin dot drawing, add labels. Still inside `useEffect`:

```typescript
// Pin number labels (1-indexed bight number for each pin)
ctx.font = `${Math.max(8, m.cellSize * 0.4)}px sans-serif`;
ctx.textBaseline = 'middle';

left.forEach(pin => {
  ctx.fillStyle = '#555';
  ctx.textAlign = 'right';
  // Label = bight number (1-indexed within strand)
  ctx.fillText(`${pin.pinNumber + 1}`, pin.x - m.pinRadius - 3, pin.y);
});

right.forEach(pin => {
  ctx.fillStyle = '#555';
  ctx.textAlign = 'left';
  ctx.fillText(`${pin.pinNumber + 1}`, pin.x + m.pinRadius + 3, pin.y);
});
```

- [ ] **Step 2: Check in browser**

Verify pin numbers appear beside each pin, correctly numbered 1..bights for each strand.

- [ ] **Step 3: Commit**

```bash
git add src/components/UnrolledMandrelDiagram.tsx
git commit -m "feat(ui): add pin number labels to UnrolledMandrelDiagram"
```

---

## Task 8: Wire into InterweavedDisplay

**Files:**
- Modify: `src/components/InterweavedDisplay.tsx`

- [ ] **Step 1: Add `UnrolledMandrelDiagram` to Overall tab**

Open `src/components/InterweavedDisplay.tsx`. Add import:

```typescript
import { UnrolledMandrelDiagram } from './UnrolledMandrelDiagram';
```

In the `activeTab === 0` block, add the diagram:

```tsx
{activeTab === 0 && (
  <div className="flex flex-col gap-4">
    <UnrolledMandrelDiagram knot={interweaved} />
    {/* <InterweavedDiagram strands={interweaved.strands} colors={interweaved.strandColors} /> */}
    <CombinedRunList interweaved={interweaved} />
  </div>
)}
```

- [ ] **Step 2: Check in browser with multi-strand knot**

Set parts=4, bights=6 (produces 2 strands). Switch to Overall tab.

Verify:
- Unrolled mandrel diagram shows 12 total pins (2 strands × 6 bights)
- Pins interleave between strands (strand 0 = pins 1,3,5,7,9,11; strand 1 = 2,4,6,8,10,12)
- Each strand drawn in its color
- Over/under gaps correct

- [ ] **Step 3: Commit**

```bash
git add src/components/InterweavedDisplay.tsx
git commit -m "feat(ui): add UnrolledMandrelDiagram to InterweavedDisplay Overall tab"
```

---

## Task 9: Write buildsummary.md

**Files:**
- Create: `docs/buildsummary.md`

- [ ] **Step 1: Write the build summary**

Create `docs/buildsummary.md`:

```markdown
# Build Summary: Unrolled Mandrel Diagram

## What Was Built

A 2D unrolled mandrel diagram for interweaved knots rendered on HTML Canvas. The diagram shows the final state of the knot with all strands as colored ribbons with correct over/under interlacing, styled as an evolution of the freakinsweetapps knotgrid.

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/unrolled-mandrel.ts` | Pure geometry: pin positions, half-cycle lines, crossing detection |
| `src/components/UnrolledMandrelDiagram.tsx` | Canvas renderer: two-pass offscreen compositing, gap punching, bight arcs |

## Key Decisions

**Interleaved pin layout:** For an interweaved knot with N strands and B bights, the mandrel has N×B total pins per side. Strand S owns pins at indices S, S+N, S+2N, ... (alternating between strands). This correctly represents how multiple strands share the same physical mandrel with interleaved pin positions.

**Two-pass offscreen compositing:** Backslash lines and slash lines are drawn to separate offscreen canvases. Gap punching uses `globalCompositeOperation = 'destination-out'` to cut holes in the "under" layer at each crossing. This produces clean over/under breaks.

**Colored ribbon rendering:** Each line is drawn twice — first in black at `strandWidth + 4px` (outline), then in strand color at `strandWidth` (fill). This gives the freakinsweetapps-style bordered ribbon look.

**Bight arcs:** Strands wrap around pins with semicircular arcs centered on the pin point, radius `pinRadius + strandWidth/2`. Right pins: 150°→30° (anticlockwise). Left pins: 210°→330° (clockwise). Diagonals begin/end at the arc tangent points.

**Geometry in lib:** All coordinate math is in `unrolled-mandrel.ts` as pure functions. The component only renders. This enables unit testing of the geometry independently of the DOM.

## How to Consume

```tsx
import { UnrolledMandrelDiagram } from './components/UnrolledMandrelDiagram';
import { InterweavedKnot } from './lib/interweaved-knot';

const knot = new InterweavedKnot({ parts: 5, bights: 6, strands: [{}] });

<UnrolledMandrelDiagram knot={knot} strandWidth={12} gapWidth={4} />
```

Props:
- `knot: InterweavedKnot` — required. The knot to render.
- `strandWidth?: number` — optional, default 12. Width of each strand in pixels.
- `gapWidth?: number` — optional, default 4. Space between strands / pin size.

Canvas dimensions are computed automatically from knot parameters and strandWidth/gapWidth.

## Reference

Visual target: https://www.freakinsweetapps.com/knots/knotgrid/
```

- [ ] **Step 2: Commit**

```bash
git add docs/buildsummary.md
git commit -m "docs: add buildsummary for unrolled mandrel diagram"
```

---

## Task 10: Run full test suite

- [ ] **Step 1: Run all tests**

```
pnpm test
```

Expected output: all tests pass including:
- `src/lib/unrolled-mandrel.test.ts` — all geometry tests
- `src/lib/interweaved-knot.test.ts` — existing tests unchanged
- `src/lib/knot.test.ts` — existing tests unchanged
- `src/lib/halfcycle.test.ts` — existing tests unchanged
- `src/lib/knotPath.test.ts` — existing tests unchanged

- [ ] **Step 2: Fix any TypeScript errors**

```
pnpm run types
```

Resolve any type errors before proceeding.

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -p
git commit -m "fix: resolve type errors from unrolled mandrel implementation"
```
