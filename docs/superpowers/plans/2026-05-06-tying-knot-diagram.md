# TyingKnotDiagram Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a component that renders a 3x vertical height tying guide diagram for an InterweavedKnot using Infinite Mandrel Projection.

**Architecture:** A utility library handles the "Infinite Mandrel" coordinate math (mapping pins across 3 sections) and generates continuous 2D paths. A React component renders these paths on a layered HTML5 Canvas, using composite operations for over/under crossings.

**Tech Stack:** React, TypeScript, HTML5 Canvas, Vitest.

---

### Task 1: Core Tying Logic - Coordinate Mapping

**Files:**
- Create: `src/lib/tying-logic.ts`
- Create: `src/lib/tying-logic.test.ts`

- [ ] **Step 1: Write failing test for pinToY**

```typescript
import { describe, it, expect } from 'vitest';
import { getPinY } from './tying-logic';

describe('tying-logic', () => {
  it('calculates pin Y correctly for even leads', () => {
    // bights=6, cellSize=10, margin=20
    // pin 1 in center section (section=1)
    // height = 6 * 10 = 60
    // y = margin + (2 - section) * height + (B - pin) * cellSize + cellSize/2
    // y = 20 + (2 - 1) * 60 + (6 - 1) * 10 + 5 = 20 + 60 + 50 + 5 = 135
    expect(getPinY(1, 1, 6, 10, 20, false)).toBe(135);
  });

  it('calculates pin Y correctly for odd leads (shifted upward)', () => {
    // pin 1 on right side (isRight=true) with odd parts
    // y = even_y - (cellSize / 2) = 135 - 5 = 130
    expect(getPinY(1, 1, 6, 10, 20, true)).toBe(130);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/tying-logic.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement getPinY**

```typescript
export function getPinY(
  pin: number,
  section: number,
  bights: number,
  cellSize: number,
  margin: number,
  isRightAndOdd: boolean
): number {
  const sectionHeight = bights * cellSize;
  let y = margin + (2 - section) * sectionHeight + (bights - pin) * cellSize + cellSize / 2;
  if (isRightAndOdd) {
    y -= cellSize / 2;
  }
  return y;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/tying-logic.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/tying-logic.ts src/lib/tying-logic.test.ts
git commit -m "feat(logic): add pin coordinate mapping for tying diagram"
```

---

### Task 2: Core Tying Logic - Path Tracing

**Files:**
- Modify: `src/lib/tying-logic.ts`
- Modify: `src/lib/tying-logic.test.ts`

- [ ] **Step 1: Write failing test for traceStrandPath**

```typescript
import { traceStrandPath } from './tying-logic';
// (Add to existing test file)
it('traces a basic path correctly', () => {
  const strandMock = {
    pins: [1, 4, 2], // Simple mock pins
    halfCycles: [
        { fromPin: 1, toPin: 4 },
        { fromPin: 4, toPin: 2 }
    ]
  };
  // Mock parameters: parts=4 (even), bights=6, cellSize=10, margin=20
  const path = traceStrandPath(strandMock as any, 4, 6, 10, 20);
  expect(path.length).toBe(3); // 3 points for 2 half-cycles
  expect(path[0].y).toBe(135); // Start at Center Pin 1
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/tying-logic.test.ts`
Expected: FAIL (traceStrandPath is not a function)

- [ ] **Step 3: Implement traceStrandPath**

```typescript
import { Knot, Point } from './types'; // Assuming Point is in types or knotPath

export function traceStrandPath(
  strand: any, 
  parts: number, 
  bights: number, 
  cellSize: number, 
  margin: number
): Point[] {
  const points: Point[] = [];
  const mandrelWidth = (parts - 1) * cellSize;
  const isOdd = parts % 2 !== 0;

  // Start in Center Window (section 1)
  let currentY = getPinY(strand.pins[0], 1, bights, cellSize, margin, false);
  points.push({ x: margin, y: currentY });

  strand.halfCycles.forEach((hc: any, i: number) => {
    const fromRight = i % 2 === 0; // HC 0 starts at Left and goes to Right
    const toRight = !fromRight;
    
    // In unrolled mandrel, dy per half cycle is fixed based on knot geometry
    // For standard knots, dy = (parts/2) * cellSize
    // Direction depends on knot slope, but for now we follow the 'pins' logic
    // simplified: we map Pin_{to} to the coordinate nearest to currentY + dy
    const dy = (parts / 2) * cellSize;
    const targetYBase = currentY + (i % 2 === 0 ? dy : -dy); // This is a heuristic, real logic follows pins
    
    // Find which wrap (section) Pin_{to} belongs to by minimizing distance to targetYBase
    // ... complex logic for wrapping ...
    // For the plan, let's keep it robust:
    const x = toRight ? margin + mandrelWidth : margin;
    const isRightAndOdd = toRight && isOdd;
    
    // Check pin Y in all 3 sections, pick closest to targetYBase (continuous flow)
    let bestY = 0;
    let minDiff = Infinity;
    [0, 1, 2].forEach(section => {
        const y = getPinY(hc.toPin, section, bights, cellSize, margin, isRightAndOdd);
        if (Math.abs(y - targetYBase) < minDiff) {
            minDiff = Math.abs(y - targetYBase);
            bestY = y;
        }
    });
    
    currentY = bestY;
    points.push({ x, y: currentY });
  });

  return points;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/tying-logic.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(logic): implement continuous path tracing across mandrel sections"
```

---

### Task 3: Component Shell & Layout

**Files:**
- Create: `src/components/TyingKnotDiagram.tsx`

- [ ] **Step 1: Implement basic component structure**

```tsx
import * as React from 'react';
import styled from 'styled-components';
import { InterweavedKnot } from '../lib/interweaved-knot';

type Props = {
  knot: InterweavedKnot;
  strandWidth: number;
  gapWidth: number;
};

const Container = styled.div`
  position: relative;
  width: 100%;
  border: 1px solid #ccc;
`;

const Canvas = styled.canvas`
  display: block;
`;

export const TyingKnotDiagram: React.FC<Props> = ({ knot, strandWidth, gapWidth }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = strandWidth + gapWidth;
    const margin = cellSize * 2;
    const width = (knot.parts - 1) * cellSize + 2 * margin;
    const sectionHeight = knot.bights * cellSize;
    const height = 3 * sectionHeight + 2 * margin;

    canvas.width = width;
    canvas.height = height;
    
    // Clear and Draw Sections
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#eee';
    ctx.strokeRect(margin, margin + sectionHeight, width - 2*margin, sectionHeight); // Active Window
  }, [knot, strandWidth, gapWidth]);

  return (
    <Container>
      <Canvas ref={canvasRef} />
    </Container>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TyingKnotDiagram.tsx
git commit -m "feat(ui): add TyingKnotDiagram component shell"
```

---

### Task 4: Full Rendering Implementation

**Files:**
- Modify: `src/components/TyingKnotDiagram.tsx`
- Modify: `src/lib/tying-logic.ts`

- [ ] **Step 1: Implement layered rendering and tiling**
- [ ] **Step 2: Add intersection and gap punching (destination-out)**
- [ ] **Step 3: Add pin labels and section indicators**
- [ ] **Step 4: Commit**

```bash
git commit -am "feat(ui): implement full path rendering with crossings and tiling"
```
