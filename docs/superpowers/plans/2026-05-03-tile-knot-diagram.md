# Tile Knot Diagram Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tile-based knot canvas renderer (`TileKnotDiagram`) that draws a flat woven braid using rectangular grid cells, coexisting with the existing isometric `KnotGrid`.

**Architecture:** A pure function `knotToGrid` in `src/lib/knotTiles.ts` maps a `Knot` to a 2D array of `CellType` values. A React canvas component `TileKnotDiagram` reads that grid and draws each cell using one of 7 drawing primitives. The component accepts `knot`, `color`, `cellSize`, and `shadowColor` props.

**Tech Stack:** React 18, TypeScript, HTML5 Canvas 2D API, styled-components, Vitest.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/knotTiles.ts` | Create | `CellType` type + `knotToGrid` pure function |
| `src/lib/knotTiles.test.ts` | Create | Unit tests for `knotToGrid` |
| `src/lib/index.ts` | Modify | Export `knotToGrid` and `CellType` |
| `src/components/TileKnotDiagram.tsx` | Create | React canvas component with all 7 cell drawing primitives |

---

### Task 1: `CellType` and `knotToGrid` in `src/lib/knotTiles.ts`

**Files:**
- Create: `src/lib/knotTiles.ts`
- Create: `src/lib/knotTiles.test.ts`
- Modify: `src/lib/index.ts`

- [ ] **Step 1: Write failing tests for `knotToGrid`**

Create `src/lib/knotTiles.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { Knot } from './knot';
import { knotToGrid, CellType } from './knotTiles';

describe('knotToGrid', () => {
  it('grid dimensions are bights rows × (parts+1) cols', () => {
    const knot = new Knot({ parts: 5, bights: 6 });
    const grid = knotToGrid(knot);
    expect(grid.length).toBe(6);
    expect(grid[0].length).toBe(6); // parts+1 = 6
  });

  it('all rows have CURVE_LEFT at col 0 and CURVE_RIGHT at col parts', () => {
    const knot = new Knot({ parts: 5, bights: 6 });
    const grid = knotToGrid(knot);
    for (let r = 0; r < 6; r++) {
      expect(grid[r][0]).toBe('CURVE_LEFT');
      expect(grid[r][5]).toBe('CURVE_RIGHT');
    }
  });

  it('interior cells are CROSS_OVER_L or CROSS_OVER_R (never EMPTY for standard knot)', () => {
    const knot = new Knot({ parts: 5, bights: 6 });
    const grid = knotToGrid(knot);
    for (let r = 0; r < 6; r++) {
      for (let c = 1; c < 5; c++) {
        expect(['CROSS_OVER_L', 'CROSS_OVER_R']).toContain(grid[r][c]);
      }
    }
  });

  it('sobre=true inverts all interior crossing types', () => {
    const knot = new Knot({ parts: 5, bights: 4, sobre: false });
    const knotSobre = new Knot({ parts: 5, bights: 4, sobre: true });
    const grid = knotToGrid(knot);
    const gridSobre = knotToGrid(knotSobre);
    for (let r = 0; r < 4; r++) {
      for (let c = 1; c < 5; c++) {
        const inverted = grid[r][c] === 'CROSS_OVER_L' ? 'CROSS_OVER_R' : 'CROSS_OVER_L';
        expect(gridSobre[r][c]).toBe(inverted);
      }
    }
  });

  it('even rows (rightward) and odd rows (leftward) have inverted crossings at same column', () => {
    const knot = new Knot({ parts: 5, bights: 4 });
    const grid = knotToGrid(knot);
    for (let c = 1; c < 5; c++) {
      const evenCell = grid[0][c]; // row 0 = rightward
      const oddCell  = grid[1][c]; // row 1 = leftward
      expect(evenCell).not.toBe(oddCell);
    }
  });

  it('works with even parts (parts=6, bights=4)', () => {
    const knot = new Knot({ parts: 6, bights: 4 });
    const grid = knotToGrid(knot);
    expect(grid.length).toBe(4);
    expect(grid[0].length).toBe(7); // parts+1 = 7
    expect(grid[0][0]).toBe('CURVE_LEFT');
    expect(grid[0][6]).toBe('CURVE_RIGHT');
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```
pnpm test -- src/lib/knotTiles.test.ts
```

Expected: fail with `Cannot find module './knotTiles'`

- [ ] **Step 3: Create `src/lib/knotTiles.ts`**

```typescript
import { Knot } from './knot';

export type CellType =
  | 'CURVE_LEFT'
  | 'CURVE_RIGHT'
  | 'CROSS_OVER_L'
  | 'CROSS_OVER_R'
  | 'STRAND_LR'
  | 'STRAND_RL'
  | 'EMPTY';

export function knotToGrid(knot: Knot): CellType[][] {
  const { parts, bights, coding, sobre } = knot;

  const grid: CellType[][] = Array.from(
    { length: bights },
    () => Array<CellType>(parts + 1).fill('EMPTY')
  );

  for (let r = 0; r < bights; r++) {
    grid[r][0]     = 'CURVE_LEFT';
    grid[r][parts] = 'CURVE_RIGHT';

    const isRightward = r % 2 === 0;

    for (let c = 1; c < parts; c++) {
      const isBackslash = (coding[c - 1] === '\\') !== sobre;
      if (isRightward) {
        grid[r][c] = isBackslash ? 'CROSS_OVER_R' : 'CROSS_OVER_L';
      } else {
        grid[r][c] = isBackslash ? 'CROSS_OVER_L' : 'CROSS_OVER_R';
      }
    }
  }

  return grid;
}
```

- [ ] **Step 4: Run tests — verify they pass**

```
pnpm test -- src/lib/knotTiles.test.ts
```

Expected: all 6 tests PASS

- [ ] **Step 5: Export from `src/lib/index.ts`**

Add to end of `src/lib/index.ts`:

```typescript
export * from './knotTiles';
```

- [ ] **Step 6: Verify TypeScript compiles**

```
pnpm run pretest
```

Expected: no errors

- [ ] **Step 7: Commit**

```
git add src/lib/knotTiles.ts src/lib/knotTiles.test.ts src/lib/index.ts
git commit -m "feat: add knotToGrid and CellType for tile-based knot visualization"
```

---

### Task 2: `TileKnotDiagram` canvas component

**Files:**
- Create: `src/components/TileKnotDiagram.tsx`

The component draws all 7 cell types on a canvas. Each cell primitive receives `(ctx, x, y, size, color, shadowColor)` where `x, y` are the top-left pixel of the cell.

**Ribbon geometry per cell (size = cellSize):**
- Ribbon width = `size * 0.35` (lineWidth)
- Curves use `quadraticCurveTo` or `arc`
- Crossings draw the under-strand first, then `clearRect` a gap at center, then draw over-strand

- [ ] **Step 1: Create `src/components/TileKnotDiagram.tsx`**

```typescript
import * as React from 'react';
import styled from 'styled-components';
import { Knot } from '../lib/knot';
import { knotToGrid, CellType } from '../lib/knotTiles';

type Props = {
  knot: Knot;
  color: string;
  cellSize?: number;
  shadowColor?: string;
};

const ResizeContainer = styled.div`
  overflow: hidden;
  resize: auto;
`;

export const TileKnotDiagram: React.FC<Props> = ({
  knot,
  color,
  cellSize = 40,
  shadowColor = 'rgba(0,0,0,0.4)',
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cols = knot.parts + 1;
    const rows = knot.bights;
    canvas.width  = cols * cellSize;
    canvas.height = rows * cellSize;
    if (canvas.parentElement) {
      canvas.parentElement.style.width  = `${canvas.width}px`;
      canvas.parentElement.style.height = `${canvas.height}px`;
    }

    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const grid = knotToGrid(knot);

    // Draw bottom row first (row 0 = bottom of knot, visually at bottom)
    for (let r = rows - 1; r >= 0; r--) {
      const visualRow = rows - 1 - r; // r=0 → bottom of canvas
      for (let c = 0; c < cols; c++) {
        const x = c * cellSize;
        const y = visualRow * cellSize;
        drawCell(ctx, x, y, cellSize, color, shadowColor, grid[r][c]);
      }
    }
  }, [knot, color, cellSize, shadowColor]);

  return (
    <ResizeContainer>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </ResizeContainer>
  );
};

function drawCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  shadowColor: string,
  cell: CellType
) {
  switch (cell) {
    case 'CURVE_LEFT':   return drawCurveLeft(ctx, x, y, size, color);
    case 'CURVE_RIGHT':  return drawCurveRight(ctx, x, y, size, color);
    case 'CROSS_OVER_L': return drawCrossOverL(ctx, x, y, size, color, shadowColor);
    case 'CROSS_OVER_R': return drawCrossOverR(ctx, x, y, size, color, shadowColor);
    case 'STRAND_LR':    return drawStrandLR(ctx, x, y, size, color);
    case 'STRAND_RL':    return drawStrandRL(ctx, x, y, size, color);
    case 'EMPTY':        return;
  }
}

const ribbonWidth = (size: number) => size * 0.35;

// Diagonal ribbon from bottom-right to top-left (\)
function drawStrandRL(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = ribbonWidth(size);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + size, y + size);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.restore();
}

// Diagonal ribbon from bottom-left to top-right (/)
function drawStrandLR(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = ribbonWidth(size);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y + size);
  ctx.lineTo(x + size, y);
  ctx.stroke();
  ctx.restore();
}

// U-curve at left edge: connects bottom-left of cell to top-left of cell, bending left
function drawCurveLeft(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = ribbonWidth(size);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  // Enters from right side of bottom-left corner, curves around left edge, exits right side of top-left corner
  ctx.moveTo(x + size * 0.5, y + size);      // bottom-center entry
  ctx.quadraticCurveTo(x - size * 0.4, y + size * 0.5, x + size * 0.5, y); // arc left
  ctx.stroke();
  ctx.restore();
}

// U-curve at right edge: connects bottom-right of cell to top-right of cell, bending right
function drawCurveRight(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = ribbonWidth(size);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x + size * 0.5, y + size);      // bottom-center entry
  ctx.quadraticCurveTo(x + size * 1.4, y + size * 0.5, x + size * 0.5, y); // arc right
  ctx.stroke();
  ctx.restore();
}

// X crossing: left-going strand (\) passes OVER right-going strand (/)
// Draw / first (under), gap at center, then draw \ (over)
function drawCrossOverL(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  shadowColor: string
) {
  const rw = ribbonWidth(size);
  const gap = rw * 0.6;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = rw;
  ctx.lineCap = 'round';

  // Under strand: bottom-left → top-right (/)
  ctx.beginPath();
  ctx.moveTo(x, y + size);
  ctx.lineTo(x + size, y);
  ctx.stroke();

  // Clear gap at center for over strand
  ctx.clearRect(x + size / 2 - gap, y + size / 2 - gap, gap * 2, gap * 2);

  // Over strand: bottom-right → top-left (\) with shadow
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = rw * 0.5;
  ctx.beginPath();
  ctx.moveTo(x + size, y + size);
  ctx.lineTo(x, y);
  ctx.stroke();

  ctx.restore();
}

// X crossing: right-going strand (/) passes OVER left-going strand (\)
// Draw \ first (under), gap at center, then draw / (over)
function drawCrossOverR(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  shadowColor: string
) {
  const rw = ribbonWidth(size);
  const gap = rw * 0.6;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = rw;
  ctx.lineCap = 'round';

  // Under strand: bottom-right → top-left (\)
  ctx.beginPath();
  ctx.moveTo(x + size, y + size);
  ctx.lineTo(x, y);
  ctx.stroke();

  // Clear gap at center for over strand
  ctx.clearRect(x + size / 2 - gap, y + size / 2 - gap, gap * 2, gap * 2);

  // Over strand: bottom-left → top-right (/) with shadow
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = rw * 0.5;
  ctx.beginPath();
  ctx.moveTo(x, y + size);
  ctx.lineTo(x + size, y);
  ctx.stroke();

  ctx.restore();
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```
pnpm run pretest
```

Expected: no errors

- [ ] **Step 3: Commit**

```
git add src/components/TileKnotDiagram.tsx
git commit -m "feat: add TileKnotDiagram canvas component with 7 cell drawing primitives"
```

---

### Task 3: Wire into app for visual verification

**Files:**
- Modify: `src/App.tsx` (temporary, revert after verification)

- [ ] **Step 1: Start dev server**

```
pnpm dev
```

- [ ] **Step 2: Import and render TileKnotDiagram in App.tsx**

Find where `KnotGrid` is rendered in `src/App.tsx`. Add `TileKnotDiagram` directly below it:

```typescript
import { TileKnotDiagram } from './components/TileKnotDiagram';
import { Knot } from './lib/knot';
```

Then in the JSX, add alongside existing diagram:

```tsx
<TileKnotDiagram
  knot={new Knot({ parts: 5, bights: 6, pattern: '\\/' })}
  color="#573c66"
  cellSize={40}
/>
```

- [ ] **Step 3: Visual checks**

Open `http://localhost:5173` and verify:
1. Flat braid appears — diagonal ribbons in interior cells, U-curves on left and right edges
2. Row count = 6 (bights), col count = 6 (parts+1)
3. Even rows and odd rows have inverted crossing types (woven appearance)
4. Change `color` prop to `"#c44"` — ribbon updates to red
5. Change `sobre` to `true` in the Knot constructor — crossings invert visually
6. Change to `new Knot({ parts: 6, bights: 4 })` — 4 rows, 7 cols, still correct

- [ ] **Step 4: Revert the temporary App.tsx change**

Remove the `TileKnotDiagram` test render and the temporary imports from `src/App.tsx`.

- [ ] **Step 5: Run full test suite**

```
pnpm test
```

Expected: all tests pass including new `knotTiles.test.ts`

- [ ] **Step 6: Commit**

```
git add src/App.tsx
git commit -m "test: verify TileKnotDiagram visual output and revert temp wiring"
```

---

## Verification Checklist

- [ ] `pnpm test` passes with all `knotTiles.test.ts` tests green
- [ ] `pnpm run pretest` (tsc) reports no type errors
- [ ] `TileKnotDiagram` renders flat braid with correct row/col dimensions
- [ ] `CURVE_LEFT` appears in every row at col 0, `CURVE_RIGHT` at col `parts`
- [ ] Interior cells alternate crossing types between even/odd rows
- [ ] `sobre=true` inverts all crossings visually
- [ ] `color` prop controls ribbon fill and stroke
- [ ] `cellSize` prop changes cell dimensions
