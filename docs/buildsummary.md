# Unrolled Mandrel Diagram Feature — Build Summary

## Overview

Built a 2D canvas diagram component that visualizes how strands weave around pins on a cylindrical mandrel. The "unrolled" view shows the mandrel unwrapped into a flat grid, with strand paths rendered as curves and line segments, including proper over/under crossing visualization.

## What Was Built

### New Files

- **`src/lib/unrolled-mandrel.ts`** — Pure geometry library exporting `makeMandrelMetrics()`, `getPinPositions()`, `getHalfCycleLines()`, and `getCrossings()`; computes all spatial coordinates and crossing logic for mandrel unwrapping.
- **`src/lib/unrolled-mandrel.test.ts`** — 20 Vitest unit tests covering geometry calculations, edge cases, and strand positioning for validation and refactoring confidence.
- **`src/components/UnrolledMandrelDiagram.tsx`** — React canvas component that renders the diagram with strand paths, pin circles, and proper layer compositing for crossing visibility.

### Modified Files

- **`src/components/KnotDisplay.tsx`** — Integrated `UnrolledMandrelDiagram` into the display to show the visual alongside existing knot representations.
- **`src/components/InterweavedDisplay.tsx`** — Added diagram to the "Overall" tab for quick visualization within the main knot editor view.

## Key Decisions

### 1. Pure Geometry Library (No React)
Separated all coordinate and line calculations into `unrolled-mandrel.ts` as pure functions. This decouples domain logic from rendering, enables unit testing without mocking canvas, and makes the code reusable (e.g., for SVG export, server-side rendering, or alternative UIs).

### 2. Interleaved Pin Layout
For N strands × B bights, each strand S owns pins at indices `S`, `S+N`, `S+2N`, etc., rather than grouping consecutive pins by strand. This interleaving:
- Reflects the actual cyclic wrapping of strands around the mandrel
- Simplifies lookup logic: pin index = `strand_id + cycle * num_strands`
- Total pins per side = `num_strands × num_bights`

### 3. Two-Pass Offscreen Compositing
Strand paths are rendered in two passes:
1. **Backslash lines** drawn to `bsCanvas` (backslash offscreen canvas)
2. **Slash lines** drawn to `slCanvas` (slash offscreen canvas)
3. **Gap punching**: Use `destination-out` composite to punch circular gaps where strands pass under
4. **Final composite**: Layer canvases onto main canvas with proper blend order for crossing visibility

This approach avoids complex path tracing and z-order management; instead, geometry and compositing handle occlusion naturally.

### 4. Arc Geometry for Pins
Strands wrap *around* pins rather than through their centers:
- Arc center = pin center
- Arc radius = `pinRadius + strandWidth / 2` (strand outer edge touches pin)
- **Right pins**: arc spans 150° → 30° counterclockwise (wraps around top-right of pin)
- **Left pins**: arc spans 210° → 330° clockwise (wraps around top-left of pin)
- Prevents visual collision and clarifies the "wrap" semantics

### 5. Odd-Parts Offset
When the knot has an odd number of parts (strands):
- Right-side pins shift upward by `cellSize / 2`
- This creates a staggered grid that correctly positions pins to reflect the mandrel geometry
- Odd-part knots have asymmetric pin layouts on opposite sides

## How to Consume

### Basic Usage

```tsx
import { UnrolledMandrelDiagram } from './components/UnrolledMandrelDiagram';

// Render a diagram for a knot object (InterweavedKnot type)
<UnrolledMandrelDiagram knot={knot} />
```

### Props

- **`knot: InterweavedKnot`** (required) — The knot data structure containing parts, strands, and bight information
- **`strandWidth?: number`** (optional, default: `12`) — Width of rendered strand lines in pixels
- **`gapWidth?: number`** (optional, default: `4`) — Width of circular gap at strand crossings in pixels

### Example with Custom Props

```tsx
<UnrolledMandrelDiagram
  knot={knot}
  strandWidth={16}
  gapWidth={6}
/>
```

### Component Location

- Path: `src/components/UnrolledMandrelDiagram.tsx`
- Export: Named export `UnrolledMandrelDiagram`
- Geometry Library: `src/lib/unrolled-mandrel.ts` (for direct geometry access if needed)

## Testing

The geometry library includes comprehensive unit tests:
- 20 test cases covering pin positioning, line calculations, and crossing logic
- Run with: `pnpm test unrolled-mandrel.test.ts`
- All tests passing before merge

## Integration Notes

- The component integrates into `KnotDisplay.tsx` and the "Overall" tab of `InterweavedDisplay.tsx`
- Canvas rendering is optimized for typical knot sizes (N ≤ 20 strands, B ≤ 50 bights)
- Responsive to viewport; canvas dimensions auto-scale based on knot size
