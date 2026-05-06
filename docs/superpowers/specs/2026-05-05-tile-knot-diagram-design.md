# TileKnotDiagram — Path-Based Rendering Design

**Date:** 2026-05-05
**Status:** Approved

## Context

`TileKnotDiagram` currently uses a tile-grid approach (`knotToGrid` → `CellType[][]`) where each cell is drawn independently on canvas. The grid mapping is incorrect and the visual output does not match the expected knot diagram (reference: `docs/6bx7l.jpg`). This redesign replaces the tile approach with path-based rendering that traces continuous strand paths through the knot geometry, enabling future strand animation and correct crossing visuals.

## Decisions

| Question | Decision |
|----------|----------|
| Rendering approach | Path-based (continuous strands, not tiles) |
| Input prop | `InterweavedKnot` (not `Knot`) |
| Configurable params | `strandWidth: number`, `gapWidth: number` (pixels) |
| Canvas sizing | Auto-computed from knot geometry + params |
| Crossing visual | Gap only (no shadow) via `destination-out` compositing |
| Crossing render | One `OffscreenCanvas` per strand; cross-strand gaps punched by over-strand |
| Canvas orientation | Pins on left/right edges; strands diagonal between them |

## Component Interface

```tsx
type Props = {
  knot: InterweavedKnot;
  strandWidth: number;  // px — width of each strand ribbon
  gapWidth: number;     // px — gap punched at under-crossings
};

export const TileKnotDiagram: React.FC<Props>
```

`ResizeContainer` wrapper preserved. Canvas sized automatically.

## Coordinate System

- **Canvas width** = `parts * (strandWidth + gapWidth)`
- **Canvas height** = `bights * 2 * (strandWidth + gapWidth)`
- **Left edge** (`x = 0`): pin entry/exit points
- **Right edge** (`x = width`): pin entry/exit points
- **Pin spacing**: `(strandWidth + gapWidth)` pixels vertically
- **Pin i** (0-indexed, top to bottom) at `y = i * (strandWidth + gapWidth)`
- Total pins per side: `2 * bights` (one per half-cycle endpoint)

## Rendering Pipeline

### Step 1 — Compute crossing registry

For every pair of half-cycles that intersect geometrically:
- Each half-cycle is a line segment from `(x0, y0)` to `(x1, y1)` in canvas space
- Solve line–line intersection → crossing pixel coordinate `(cx, cy)`
- Determine over/under from `halfCycle.runs` — each run corresponds to one crossing along the half-cycle path, in traversal order. The nth crossing coordinate on the half-cycle maps to the nth run entry. Over-strand = `'O'`, under-strand = `'U'`.
- Store in a `CrossingRegistry`: `Map<halfCycleId, CrossingPoint[]>`

### Step 2 — Per-strand offscreen canvas

For each strand in `InterweavedKnot.strands`:
- Create `OffscreenCanvas` matching main canvas dimensions
- Get 2D context with `{ willReadFrequently: false }`

### Step 3 — Draw strand paths

For each half-cycle belonging to the strand:
- **Interior half-cycle**: draw diagonal line from pin to pin
  - `ctx.lineWidth = strandWidth`
  - `ctx.strokeStyle = InterweavedKnot.strandColors[strandIndex]`
  - `ctx.lineCap = 'butt'` (no rounding — gaps must be clean)
- **Edge half-cycle** (bight curve): draw arc connecting two adjacent pins on same edge
  - Two parallel arcs with `gapWidth` separation between them
  - Arc radius = half the pin spacing = `(strandWidth + gapWidth) / 2`
  - Inner arc radius = `arcRadius - gapWidth/2`, outer = `arcRadius + gapWidth/2`

### Step 4 — Punch crossing gaps

For each crossing where this strand is the **under-strand**:
- The **over-strand**'s render step punches the gap on this strand's offscreen canvas
- Gap punch: `ctx.globalCompositeOperation = 'destination-out'`
- Draw a rectangle centered at `(cx, cy)`, width/height = `gapWidth * 2`
- Reset `globalCompositeOperation = 'source-over'`

Cross-strand coordination: crossing registry built in Step 1 is shared across all strand renders. Each strand's render loop checks: "for crossings where I am over, punch gap on the under-strand's offscreen canvas."

### Step 5 — Composite to main canvas

```
for each strand (in order):
  mainCtx.drawImage(strandOffscreenCanvas, 0, 0)
```

## Data Sources

| Data | Source |
|------|--------|
| Strand paths (half-cycles) | `InterweavedKnot.strands[i].halfCycles` |
| Over/under at each step | `HalfCycle.runs` (`'O'`/`'U'`) |
| Pin positions | Derived from `knot.bights` + coord system above |
| Strand colors | `InterweavedKnot.strandColors[i]` |
| Parts / bights | `InterweavedKnot.parts`, `InterweavedKnot.bights` |

## Files Modified

- `src/components/TileKnotDiagram.tsx` — full rewrite
- `src/lib/knotTiles.ts` — delete `knotToGrid` and `CellType` (no other consumers)
- `src/lib/knotTiles.test.ts` — delete or repurpose tests

## Out of Scope

- Strand animation (roadmap — path-based approach enables this)
- Interactive controls for `strandWidth`/`gapWidth`
- Multi-page / multi-knot rendering

## Verification

1. Run dev server: `npm run dev`
2. Navigate to knot diagram page with `parts=7, bights=6` (6b×7l knot)
3. Visual output matches `docs/6bx7l.jpg`:
   - Correct number of diagonal strands
   - Crossings show gap (over-strand unbroken, under-strand has gap)
   - Bight curves on left/right edges show two parallel arcs
4. Change `strandWidth`/`gapWidth` props → canvas resizes, proportions update
5. Run test suite: `npm test` — no regressions
