# Unrolled Mandrel Diagram — Design Spec

**Date:** 2026-05-09  
**Branch:** feat/agent-team-diagram  
**Reference:** https://www.freakinsweetapps.com/knots/knotgrid/

---

## Goal

Build a working, realistic 2D unrolled mandrel diagram for an interweaved knot using canvas. Shows the final state of the knot with all strands rendered as colored ribbons with correct over/under interlacing. Styled as an evolution of the freakinsweetapps knotgrid — same geometric approach, colored per strand, multi-strand aware.

---

## New Files

```
src/lib/unrolled-mandrel.ts                              # geometry lib
src/components/UnrolledMandrelDiagram.tsx                # canvas renderer
docs/buildsummary.md                                     # deliverable doc
```

## Modified Files

```
src/components/KnotDisplay.tsx         # add UnrolledMandrelDiagram below existing
src/components/InterweavedDisplay.tsx  # add UnrolledMandrelDiagram below existing
```

---

## Architecture

### Data Flow

```
InterweavedKnot
  (parts, bights, strands[], numStrands)
        │
        ▼
src/lib/unrolled-mandrel.ts
  getPinPositions()     → { left: Point[], right: Point[] }
  getHalfCycleLines()   → Line[]
  getCrossings()        → Crossing[]
        │
        ▼
UnrolledMandrelDiagram.tsx
  (canvas, 2-pass offscreen render, gap punch, bight arcs, pin labels)
```

### Component Props

```ts
type Props = {
  knot: InterweavedKnot;
  strandWidth?: number;  // default 12
  gapWidth?: number;     // default 4
}
```

---

## Geometry

### Canvas Sizing

```
cellSize      = strandWidth + gapWidth
margin        = cellSize × 2
pinRadius     = gapWidth / 2
outlineWidth  = 2  (px, constant)
totalPins     = numStrands × bights
mandrelWidth  = (parts - 1) × cellSize
canvasWidth   = mandrelWidth + 2 × margin
canvasHeight  = totalPins × cellSize + 2 × margin
```

Canvas size derives entirely from knot parameters + strandWidth/gapWidth. No hardcoded pixel sizes.

### Pin Positions (Interleaved)

- Total pins on each side = `numStrands × bights`
- Pin `p` (0-indexed) Y = `margin + p × cellSize + cellSize/2`
- Strand `s` (0-indexed) owns pins at indices: `s, s + numStrands, s + 2×numStrands, ...`
- Left pins: x = `margin`
- Right pins: x = `margin + mandrelWidth`
- Odd-parts offset: right-side pins shift up by `cellSize/2`

### Half-Cycle Lines

- Each `HalfCycle` in `strand.halfCycles` goes `fromPin → toPin` at 30° diagonal (tan 30°)
- Line direction alternates: even HC index = left→right, odd = right→left
- Free-run HC (no runs): diagonal drawn, no crossing data required
- HC with runs (O/U sequence): diagonal with crossings computed from `getCrossings()`

### Crossing Detection

- Backslash lines (`\`): top-left → bottom-right
- Slash lines (`/`): bottom-left → top-right
- Intersect every `\` line with every `/` line using `lineIntersection()` from `tying-logic.ts`
- Column index at crossing: `Math.floor((crossingX - margin) / cellSize)`
- Over/under: `strand.coding[col] === '\\'` → backslash is over → punch gap on slash canvas
- Inverted when `strand.sobre === true`

### Bight Arcs

Strand wraps *around* the pin — arc is centered on pin point, strand traces outside.

- Arc center: pin point
- Arc radius: `pinRadius + strandWidth/2`
- Stroke width: `strandWidth`
- **Right-side pins:** arc from 150° → 30° (counterclockwise, wrapping over top)
- **Left-side pins:** arc from 210° → 330° (counterclockwise, wrapping over top)
- Incoming diagonal terminates at arc tangent point; outgoing starts there — continuous path

---

## Rendering Pipeline

### Two-Pass Offscreen Compositing

1. Create `bsCanvas` (offscreen) — for all `\` lines + arcs
2. Create `slCanvas` (offscreen) — for all `/` lines + arcs
3. For each strand, draw to correct offscreen canvas:
   - Black pass: stroke at `strandWidth + outlineWidth×2`, color black (outline)
   - Color pass: stroke at `strandWidth`, color = strand color (fill)
4. For each crossing — on the "under" line's canvas:
   - `globalCompositeOperation = 'destination-out'`
   - Punch gap rectangle perpendicular to "over" line at crossing point
5. Composite `bsCanvas` then `slCanvas` onto main canvas
6. Draw pin dots (small filled circles) on top
7. Draw pin number labels

### Colored Ribbon Look

Each strand drawn as outlined ribbon:
- Thick black stroke first (creates outline border)
- Strand-color stroke second at narrower width (fills interior)
- Both passes on same offscreen canvas per direction (backslash/slash)
- Gap punching operates on the combined layer

---

## UI Integration

- `UnrolledMandrelDiagram` added **below** existing diagrams in `KnotDisplay` and `InterweavedDisplay`
- No tabs or switching — both old grid and new unrolled mandrel visible
- `strandWidth=12`, `gapWidth=4` as defaults (not exposed in controls for this iteration)

---

## Agent Team

Three teammates, Haiku model:

| Agent | Role | Waits for |
|-------|------|-----------|
| **Designer** | Visits freakinsweetapps, generates reference screenshots for specific parts/bights combos. Posts expected visual output as mock specification for Frontend and QA. | Nothing — starts immediately |
| **Frontend Dev** | Builds `unrolled-mandrel.ts` + `UnrolledMandrelDiagram.tsx` + wires into display components | Designer mocks |
| **QA** | Visually inspects rendered canvas in browser against Designer mocks. Reports discrepancies. | Designer mocks + Frontend done |

---

## Deliverables

1. `src/lib/unrolled-mandrel.ts` — geometry lib (pin positions, lines, crossings)
2. `src/components/UnrolledMandrelDiagram.tsx` — canvas component (two-pass render, gap punch, arcs)
3. `src/components/KnotDisplay.tsx` — updated (new diagram added)
4. `src/components/InterweavedDisplay.tsx` — updated (new diagram added)
5. `docs/buildsummary.md` — what was built, key decisions, how to consume the component

---

## Out of Scope

- Controls to adjust `strandWidth` / `gapWidth` in UI
- Exporting diagram as image
- Animation or tying-guide mode
- Pineapple / gaucho / herringbone variants
