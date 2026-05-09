# UnrolledMandrelDiagram Refinement

**Date:** 2026-05-09  
**Branch:** feat/agent-team-diagram  
**Reference:** https://www.freakinsweetapps.com/knots/knotgrid/?width=268&height=211&parts=7&bights=6&strand_width=14&orient=horizontal

## Goal

Fix three correctness gaps in `UnrolledMandrelDiagram` and `computeMandrelPieces`:

1. Crossing O/U reads from `halfCycle.runs[]` (single source of truth)
2. Configurable gap between knot rows (like freakinsweetapps)
3. Column width scales by `numStrands` so interleaved knots have room

## Decisions

| Question | Decision |
|---|---|
| Crossing O/U source | `hc.runs[j]` directly — already flat per-crossing array |
| Free-run crossings | `runs[j] === undefined` → plain filled rect, no edge lines, no compositing |
| Gap sizing | Configurable `knotGap` prop on component; default = `bightDist / 2` inside `computeMandrelPieces` |
| Column width | `innerWidth = strandParts × cellSize × numStrands` |

## Changes

### `unrolled-mandrel.ts` — `computeMandrelPieces`

**Signature:**
```ts
export function computeMandrelPieces(
  knot: InterweavedKnot,
  strandWidth: number,
  knotGap?: number
): { metrics: MandrelMetricsFSA; pieces: MandrelPiece[][] }
```

**Column width:**
```ts
const innerWidth = Math.ceil(strandParts * cellSize * numStrands);
```
All geometry (`adj`, `hyp`, `partDist`, `angle`, `dx`, `dy`) recalculates from the new `innerWidth` — no other geometry changes.

**Canvas height with gap:**
```ts
const resolvedGap = knotGap ?? bightDist / 2;
const canvasHeight = numStrands * heightPerStrand + (numStrands - 1) * resolvedGap;
```

**Strand y-offset:**
```ts
let starty = strandIndex * (heightPerStrand + resolvedGap);
```

**Crossing O/U (replaces all `coding`/`sobre` re-derivation):**
```ts
// inside j-loop (0 .. parts-2):
const uo = hc.runs[j] as 'O' | 'U' | undefined;
pieces.push({ x: x + xOffset, y, type, uo: uo ?? null, strandIndex, hcIndex });
```

`null` uo = free-run segment (same meaning as miter; draw plain strand).

**`MandrelMetricsFSA` gains:**
```ts
knotGap: number; // resolved gap value
```

### `UnrolledMandrelDiagram.tsx`

Add `knotGap` prop, pass through:
```tsx
type Props = {
  knot: InterweavedKnot;
  strandWidth?: number;
  knotGap?: number;
};

const { metrics, pieces } = computeMandrelPieces(knot, strandWidth, knotGap);
```

**Draw function — `drawCrossing`:**

`uo === null` (free-run segment) → plain filled rect, no edge lines, no compositing:
```ts
if (uo === null) {
  ctx.fillStyle = color;
  ctx.fillRect(-pd / 2, -sw / 2, pd, sw);
  ctx.restore();
  return;
}
```
`uo === 'O'` and `uo === 'U'` behaviour unchanged.

### `unrolled-mandrel.test.ts`

Update / add tests:

- `canvasHeight` test: now `numStrands * heightPerStrand + (numStrands - 1) * (bightDist / 2)`
- New: `innerWidth` scales by `numStrands` for multi-strand knot
- New: free-run HC (HC0 of any knot) produces pieces with `uo === null` for crossing slots beyond `runs.length`
- New: `metrics.knotGap` equals `bightDist / 2` when not specified
- New: explicit `knotGap` is reflected in `metrics.knotGap`

## Invariants Preserved

- Single-strand, single-knot (N=1) geometry unchanged except `innerWidth` multiplied by 1
- Miter pieces unchanged — `uo: null` meaning unchanged
- Draw functions for miter unchanged
- Compositing logic for `'O'`/`'U'` pieces unchanged
- `sobre` correctness now falls out of `Knot.fillHalfCycles` — no manual flip in diagram code
