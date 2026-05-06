# Design: TyingKnotDiagram Component

The `TyingKnotDiagram` component provides a visualization of a knot diagram specifically designed for use as a tying guide. It represents the mandrel as an "unrolled" flat plane with 3x vertical repetition to show the continuous "true path" of the strands.

## 1. Goal
Create a component that renders all strands of an `InterweavedKnot` on an HTML Canvas. The diagram must show the path of the strands as they wrap around the mandrel, using a 3x vertical height to allow for continuous lines that don't "jump" at the boundaries.

## 2. Input Props
- `knot: InterweavedKnot`: The knot data containing strands, parts, and bights.
- `strandWidth: number`: Thickness of the drawn strands.
- `gapWidth: number`: Space between strands in the grid.

## 3. Coordinate System & Pin Mapping

### Dimensions
- `cellSize = strandWidth + gapWidth`
- `mandrelWidth = (parts - 1) * cellSize`
- `sectionHeight = bights * cellSize`
- `totalHeight = 3 * sectionHeight` (Top, Center/Active, Bottom)
- `margin`: Buffer space (approx. 2 * cellSize) for pin labels and padding.

### Pin Positions
Pins are 1-indexed from bottom to top within each section.
- **Left Pins:**
  - $x = margin$
  - $y(section, pin) = margin + (2 - section) \times sectionHeight + (B - pin) \times cellSize + cellSize/2$
  - Where $section \in \{0: top, 1: center, 2: bottom\}$ and $pin \in \{1 \dots B\}$.
- **Right Pins:**
  - $x = margin + mandrelWidth$
  - If `parts` is even: $y_{right} = y_{left}$.
  - If `parts` is odd: $y_{right} = y_{left} - (cellSize / 2)$ (**Shifted Upward**).

## 4. Path Generation (Infinite Mandrel Projection)

We treat the mandrel as a continuous coordinate space.

### Algorithm
1. **Initialize Strands**: For each strand in the interweaved knot:
   - Start at the first pin defined in the `Knot`'s `pins` array, assumed to be in the **Center Window**.
   - Current $y$ is the coordinate of that pin in Section 1 (Center).
2. **Trace Half-Cycles**: For each `halfCycle` ($Pin_{from} \to Pin_{to}$):
   - The $x$ coordinate moves from $margin$ to $margin + mandrelWidth$ (or vice versa).
   - The vertical displacement $\Delta y$ is determined by the knot's geometry. In this projection, it is always $\pm (parts / 2) \times cellSize$.
   - Because `parts` may be odd, the right-side pins are shifted by $0.5 \times cellSize$, which perfectly aligns with the $(N + 0.5)$ displacement.
   - Example ($P=5, B=6$): Starting at Left Pin 1 ($y=y_{L1}$), the first half-cycle lands on Right Pin $1 + 2.5 = 3.5$. Since right pins are shifted by 0.5, this lands exactly on the 3rd right-side pin.
   - We maintain a `cumulativeY` for each strand to track its physical position across the infinite vertical plane.
3. **Tiling**: To ensure the Center Window is fully populated and shows all crossings, the entire "infinite" path for all strands is rendered three times with vertical offsets of $-sectionHeight, 0, +sectionHeight$.

## 5. Rendering & Crossings

### Layered Rendering
- **Layer 1 (\):** Paths with positive slope (NW-SE).
- **Layer 2 (/):** Paths with negative slope (SW-NE).

### Intersection & Gaps
1. Find all intersections between lines in Layer 1 and Layer 2.
2. At each intersection:
   - Determine the grid column ($x$) and row ($y$) index relative to the knot's coding.
   - Lookup the `coding` (Over/Under) from the `Knot` logic.
   - If the current strand is "Under", use `globalCompositeOperation = 'destination-out'` to erase a small gap in that strand's path.
3. Composite all layers onto the final canvas.

## 6. Visual Features
- **Mandrel Sections**: Visual separators or background shading for the Top, Center, and Bottom sections.
- **Active Window**: A prominent border (square) around the Center Window.
- **Pin Labels**: Numbers $1 \dots B$ rendered next to each pin in all 3 sections.
- **Strand Colors**: Use colors defined in `knot.strandColors`.

## 7. Success Criteria
- Strands appear as continuous lines through the 3x mandrel area.
- Right-side pins are correctly offset for odd-part knots.
- Over/Under crossings correctly reflect the knot's coding.
- The Center Window provides a clear, focused view of the bights.
