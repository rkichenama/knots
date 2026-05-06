export type Point = { x: number; y: number };

// Returns intersection point if two line segments intersect, null otherwise.
export function lineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
  const d1x = p2.x - p1.x,
    d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x,
    d2y = p4.y - p3.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-10) return null;

  const dx = p3.x - p1.x,
    dy = p3.y - p1.y;
  const t = (dx * d2y - dy * d2x) / denom;
  const u = (dx * d1y - dy * d1x) / denom;

  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: p1.x + t * d1x, y: p1.y + t * d1y };
}

// Point on AB at distance d from A toward B.
export function along(a: Point, b: Point, d: number): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1e-10) return a;
  const t = d / len;
  return { x: a.x + dx * t, y: a.y + dy * t };
}

export function getPinY(
  pin: number,
  section: number,
  bights: number,
  cellSize: number,
  margin: number,
  isRightAndOdd: boolean
): number {
  const sectionHeight = bights * cellSize;
  // section: 0=top, 1=center, 2=bottom
  let y = margin + (2 - section) * sectionHeight + (bights - pin) * cellSize + cellSize / 2;
  if (isRightAndOdd) {
    y -= cellSize / 2;
  }
  return y;
}

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
    const dy = (parts / 2) * cellSize;
    // Slope depends on if we are going Right-to-Left or Left-to-Right
    // In our unrolled projection, let's assume direction is consistent with 'dy' logic
    const targetYBase = currentY + (i % 2 === 0 ? dy : -dy);
    
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
