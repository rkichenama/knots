# UnrolledMandrelDiagram Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix crossing O/U sourcing, add configurable knot-row gap, and scale column width by numStrands in UnrolledMandrelDiagram.

**Architecture:** All geometry lives in `computeMandrelPieces` (unrolled-mandrel.ts); the React component (UnrolledMandrelDiagram.tsx) only passes props and draws pieces. Changes are: (1) `innerWidth` scales by `numStrands`, (2) canvas height adds per-gap rows, (3) piece `uo` reads from `hc.runs[j]` instead of re-deriving from `coding`. Draw logic in the component gains a null-uo branch for free-run segments.

**Tech Stack:** TypeScript, React, canvas 2D API, Vitest

---

### Task 1: Update `MandrelMetricsFSA` type and `computeMandrelPieces` signature

**Files:**
- Modify: `src/lib/unrolled-mandrel.ts`

- [ ] **Step 1: Add `knotGap` to `MandrelMetricsFSA`**

In `src/lib/unrolled-mandrel.ts`, find the `MandrelMetricsFSA` type (line ~84) and add `knotGap`:

```ts
export type MandrelMetricsFSA = {
  strandWidth: number;
  gapSize: number;
  bightDist: number;
  partDist: number;
  angle: number;
  dx: number;
  dy: number;
  canvasWidth: number;
  canvasHeight: number;
  knotGap: number;
};
```

- [ ] **Step 2: Add `knotGap` parameter to `computeMandrelPieces`**

Change the function signature from:
```ts
export function computeMandrelPieces(
  knot: InterweavedKnot,
  strandWidth: number
): { metrics: MandrelMetricsFSA; pieces: MandrelPiece[][] }
```
to:
```ts
export function computeMandrelPieces(
  knot: InterweavedKnot,
  strandWidth: number,
  knotGap?: number
): { metrics: MandrelMetricsFSA; pieces: MandrelPiece[][] }
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd D:/Code/knots && npx tsc --noEmit
```

Expected: no errors (knotGap not yet used in body, but optional param and type extension are non-breaking).

- [ ] **Step 4: Commit**

```bash
git add src/lib/unrolled-mandrel.ts
git commit -m "feat(mandrel): add knotGap param and field to MandrelMetricsFSA"
```

---

### Task 2: Scale `innerWidth` by `numStrands`

**Files:**
- Modify: `src/lib/unrolled-mandrel.ts`
- Test: `src/lib/unrolled-mandrel.test.ts`

- [ ] **Step 1: Write failing test**

Add to `describe('computeMandrelPieces — metrics')` in `src/lib/unrolled-mandrel.test.ts`:

```ts
it('innerWidth scales by numStrands for multi-strand knot', () => {
  // 6P×4B → gcd=2, numStrands=2, strandParts=3, strandBights=2
  const knot1 = new InterweavedKnot({ parts: 6, bights: 4, strands: [{}, {}] });
  const sw = 20;
  const { metrics: m1 } = computeMandrelPieces(knot1, sw);

  // Single strand equivalent: 3P×2B
  const knot2 = new InterweavedKnot({ parts: 3, bights: 2, strands: [{}] });
  const { metrics: m2 } = computeMandrelPieces(knot2, sw);

  // multi-strand canvas should be ~2x wider (numStrands=2 vs 1)
  // canvasWidth = innerWidth + edgeMargin*2; innerWidth doubles
  // We verify the difference is approximately innerWidth_single * (numStrands-1)
  const strandParts = knot2.strands[0].parts;
  const d = sw * 0.35;
  const cellSize = (sw + d) * Math.sqrt(2) / 2;
  const expectedInnerDiff = Math.ceil(strandParts * cellSize * 1); // one extra strand's worth
  expect(m1.canvasWidth - m2.canvasWidth).toBeCloseTo(expectedInnerDiff, -1);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd D:/Code/knots && npx vitest run src/lib/unrolled-mandrel.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: FAIL — current `innerWidth` doesn't multiply by `numStrands`.

- [ ] **Step 3: Update `innerWidth` in `computeMandrelPieces`**

In `src/lib/unrolled-mandrel.ts`, find:
```ts
const innerWidth = Math.ceil(strandParts * cellSize);
```
Replace with:
```ts
const innerWidth = Math.ceil(strandParts * cellSize * numStrands);
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd D:/Code/knots && npx vitest run src/lib/unrolled-mandrel.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: PASS.

- [ ] **Step 5: Run full test suite to check regressions**

```bash
cd D:/Code/knots && npx vitest run --reporter=verbose 2>&1 | tail -30
```

Expected: all existing tests pass (geometry invariant tests may need values updated — fix any that fail due to changed `innerWidth`).

- [ ] **Step 6: Commit**

```bash
git add src/lib/unrolled-mandrel.ts src/lib/unrolled-mandrel.test.ts
git commit -m "feat(mandrel): scale innerWidth by numStrands for interleaved knots"
```

---

### Task 3: Add gap to canvas height and strand y-offsets

**Files:**
- Modify: `src/lib/unrolled-mandrel.ts`
- Test: `src/lib/unrolled-mandrel.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `src/lib/unrolled-mandrel.test.ts`:

```ts
it('canvasHeight includes gap between strands for multi-strand knot', () => {
  const knot = new InterweavedKnot({ parts: 4, bights: 6, strands: [{}, {}] });
  const sw = 20;
  const { metrics } = computeMandrelPieces(knot, sw);
  const strandBights = knot.strands[0].bights;
  const heightPerStrand = Math.ceil(2 * strandBights * metrics.bightDist / 2); // bightDist/2 * 2 * bights = bights * bightDist ... recalc:
  // heightPerStrand = Math.ceil(2 * strandBights * cellSize) = Math.ceil(strandBights * bightDist)
  const expectedHeight =
    knot.numStrands * Math.ceil(strandBights * metrics.bightDist) +
    (knot.numStrands - 1) * (metrics.bightDist / 2);
  expect(metrics.canvasHeight).toBeCloseTo(expectedHeight, 0);
});

it('metrics.knotGap equals bightDist/2 when not specified', () => {
  const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
  const { metrics } = computeMandrelPieces(knot, 20);
  expect(metrics.knotGap).toBeCloseTo(metrics.bightDist / 2);
});

it('explicit knotGap reflected in metrics.knotGap', () => {
  const knot = new InterweavedKnot({ parts: 5, bights: 4, strands: [{}] });
  const { metrics } = computeMandrelPieces(knot, 20, 30);
  expect(metrics.knotGap).toBe(30);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd D:/Code/knots && npx vitest run src/lib/unrolled-mandrel.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: 3 new tests FAIL.

- [ ] **Step 3: Resolve gap and update canvas height in `computeMandrelPieces`**

In `src/lib/unrolled-mandrel.ts`, after `bightDist` is computed, add:

```ts
const resolvedGap = knotGap ?? bightDist / 2;
```

Replace:
```ts
const canvasHeight = totalHeight;
```
with:
```ts
const canvasHeight = numStrands * heightPerStrand + (numStrands - 1) * resolvedGap;
```

(Remove the `totalHeight` intermediate variable — it's no longer used.)

- [ ] **Step 4: Update strand y-offset to include gap**

In the `allPieces` map, replace:
```ts
let starty = strandIndex * bightDist;
```
with:
```ts
let starty = strandIndex * (heightPerStrand + resolvedGap);
```

- [ ] **Step 5: Store `resolvedGap` in metrics**

Add to the `metrics` object:
```ts
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
```

- [ ] **Step 6: Fix the existing canvasHeight test**

Find the existing test:
```ts
it('canvasHeight = numStrands * bights_per_strand * bightDist for single-strand knot', () => {
```

Update its expected value — for a single-strand knot, `numStrands - 1 = 0` so gap term is zero; the formula simplifies to the same as before. Verify it still passes as-is. If it references `Math.ceil(knot.numStrands * strandBights * metrics.bightDist)`, that stays correct for N=1.

- [ ] **Step 7: Run test suite**

```bash
cd D:/Code/knots && npx vitest run --reporter=verbose 2>&1 | tail -30
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/lib/unrolled-mandrel.ts src/lib/unrolled-mandrel.test.ts
git commit -m "feat(mandrel): add configurable knotGap to canvas height and strand offsets"
```

---

### Task 4: Source crossing O/U from `hc.runs[j]`

**Files:**
- Modify: `src/lib/unrolled-mandrel.ts`
- Test: `src/lib/unrolled-mandrel.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `src/lib/unrolled-mandrel.test.ts`:

```ts
it('HC0 crossing pieces have uo=null (free-run, no runs populated)', () => {
  // HC0 is always a free-run — Knot.fillHalfCycles only appends to HC1+
  const knot = new InterweavedKnot({ parts: 7, bights: 6, strands: [{}] });
  const { pieces } = computeMandrelPieces(knot, 14);
  const hc0Crossings = pieces[0].filter(p => p.hcIndex === 0 && (p.type === 'right' || p.type === 'left'));
  expect(hc0Crossings.length).toBeGreaterThan(0);
  for (const p of hc0Crossings) {
    expect(p.uo).toBeNull();
  }
});

it('sobre knot produces different uo pattern than non-sobre', () => {
  const base  = new InterweavedKnot({ parts: 7, bights: 6, strands: [{ sobre: false }] });
  const sobre = new InterweavedKnot({ parts: 7, bights: 6, strands: [{ sobre: true  }] });
  const { pieces: pBase  } = computeMandrelPieces(base,  14);
  const { pieces: pSobre } = computeMandrelPieces(sobre, 14);
  // Find first HC with actual crossings (hcIndex > 0 with non-null uo)
  const baseCrossings  = pBase[0].filter(p => p.uo !== null && (p.type === 'right' || p.type === 'left'));
  const sobreCrossings = pSobre[0].filter(p => p.uo !== null && (p.type === 'right' || p.type === 'left'));
  // At least one crossing should differ
  const anyDiffer = baseCrossings.some((p, i) => sobreCrossings[i]?.uo !== p.uo);
  expect(anyDiffer).toBe(true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd D:/Code/knots && npx vitest run src/lib/unrolled-mandrel.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: both new tests FAIL (current code derives uo from coding, not runs).

- [ ] **Step 3: Replace O/U derivation in `computeMandrelPieces`**

In `src/lib/unrolled-mandrel.ts`, inside the `halfCycles.forEach` loop, replace the entire crossing piece emission block. Find:

```ts
      // Emit crossing pieces (parts-1 per HC)
      for (let j = 0; j < parts - 1; j++) {
        const x = goingRight
          ? startx + (j + 1) * dx
          : startx - (j + 1) * dx;
        const rawY = starty + (j + 1) * dy;
        const y = ((rawY % canvasHeight) + canvasHeight) % canvasHeight;

        const type: MandrelPiece['type'] = goingRight ? 'right' : 'left';

        // Over/under from coding string
        const codingIndex = goingRight ? j : parts - 2 - j;
        const ch = coding[codingIndex] ?? '\\';
        let over = (sobre && ch === '\\') || (!sobre && ch === '/');
        if (!goingRight) over = !over; // flip for left-going HCs

        const uo: 'O' | 'U' = over ? 'O' : 'U';
        pieces.push({ x: x + xOffset, y, type, uo, strandIndex, hcIndex });
      }
```

Replace with:

```ts
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
```

Also remove the unused `const { halfCycles, coding, sobre, parts } = strand;` destructure — `coding` and `sobre` are no longer needed:

```ts
const { halfCycles, parts } = strand;
```

- [ ] **Step 4: Run tests**

```bash
cd D:/Code/knots && npx vitest run --reporter=verbose 2>&1 | tail -30
```

Expected: all pass including new O/U and sobre tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/unrolled-mandrel.ts src/lib/unrolled-mandrel.test.ts
git commit -m "feat(mandrel): source crossing O/U from halfCycle.runs, drop coding re-derivation"
```

---

### Task 5: Add `knotGap` prop to `UnrolledMandrelDiagram` and handle free-run draw

**Files:**
- Modify: `src/components/UnrolledMandrelDiagram.tsx`

- [ ] **Step 1: Add `knotGap` to Props and pass to `computeMandrelPieces`**

In `src/components/UnrolledMandrelDiagram.tsx`, replace:

```tsx
type Props = {
  knot: InterweavedKnot;
  strandWidth?: number;
};
```

with:

```tsx
type Props = {
  knot: InterweavedKnot;
  strandWidth?: number;
  knotGap?: number;
};
```

Replace the component signature:

```tsx
export const UnrolledMandrelDiagram: React.FC<Props> = ({
  knot,
  strandWidth = 16,
}) => {
```

with:

```tsx
export const UnrolledMandrelDiagram: React.FC<Props> = ({
  knot,
  strandWidth = 16,
  knotGap,
}) => {
```

Replace the `computeMandrelPieces` call:

```tsx
const { metrics, pieces } = computeMandrelPieces(knot, strandWidth);
```

with:

```tsx
const { metrics, pieces } = computeMandrelPieces(knot, strandWidth, knotGap);
```

- [ ] **Step 2: Handle `uo === null` (free-run) in `drawCrossing`**

In `src/components/UnrolledMandrelDiagram.tsx`, at the top of `drawCrossing`, add a free-run branch immediately after the rotation:

```ts
function drawCrossing(
  ctx: CanvasRenderingContext2D,
  piece: MandrelPiece,
  metrics: MandrelMetricsFSA,
  color: string
): void {
  const { x, y, type, uo } = piece;
  const { partDist, angle, strandWidth } = metrics;
  const sw = strandWidth;
  const pd = partDist;

  ctx.save();
  ctx.translate(x, y);

  if (type === 'right') {
    ctx.rotate(Math.PI / 2 + angle);
  } else {
    ctx.rotate(Math.PI / 2 - angle);
  }

  // Free-run segment: plain filled rect, no edge lines, no compositing
  if (uo === null) {
    ctx.fillStyle = color;
    ctx.fillRect(-pd / 2, -sw / 2, pd, sw);
    ctx.restore();
    return;
  }

  // ... rest of existing O/U logic unchanged ...
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd D:/Code/knots && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/UnrolledMandrelDiagram.tsx
git commit -m "feat(mandrel): add knotGap prop and free-run draw branch to UnrolledMandrelDiagram"
```

---

### Task 6: Visual verification

**Files:** none (read-only dev server check)

- [ ] **Step 1: Start dev server**

```bash
cd D:/Code/knots && pnpm dev
```

- [ ] **Step 2: Open the app and verify with 7P×6B knot**

Navigate to the UnrolledMandrelDiagram in the UI. Check:

- Single knot (7P×6B): crossings show correct over/under pattern matching freakinsweetapps reference
- Toggle `sobre` on a strand: over/under inverts at crossings
- Two-strand knot: gap visible between rows; canvas wider than single-strand
- Three-strand knot: three rows, two gaps, canvas 3× wider than single

- [ ] **Step 3: Run full test suite**

```bash
cd D:/Code/knots && npx vitest run --coverage 2>&1 | tail -20
```

Expected: all pass.
