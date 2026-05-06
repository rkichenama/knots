import * as React from 'react';
import styled from 'styled-components';
import { InterweavedKnot } from '../lib/interweaved-knot';
import { lineIntersection, Point } from '../lib/knotPath';
import { Knot } from '../lib/knot';
import { HalfCycle } from '../lib/halfcycle';

type Props = {
  knot: InterweavedKnot;
  strandWidth: number;
  gapWidth: number;
};

const ResizeContainer = styled.div`
  overflow: hidden;
  resize: auto;
`;

export const PathKnotDiagram: React.FC<Props> = ({ knot, strandWidth, gapWidth }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cellSize = strandWidth + gapWidth;
    const margin = cellSize;
    const width = (knot.parts - 1) * cellSize + 2 * margin;
    const height = knot.bights * cellSize + 2 * margin;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, width, height);

    render(ctx, knot, strandWidth, gapWidth, cellSize, margin, width, height);
  }, [knot, strandWidth, gapWidth]);

  return (
    <ResizeContainer>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </ResizeContainer>
  );
};

// pin 1-indexed (1=bottom, bights=top). Canvas y increases downward.
function pinToY(pin: number, bights: number, margin: number, cellSize: number): number {
  return margin + (bights - pin) * cellSize + cellSize / 2;
}

type HCLine = {
  hc: HalfCycle;
  hcIndex: number;
  from: Point; // full edge point
  to: Point; // full edge point
  isBackslash: boolean; // true if from.y < to.y when going left-to-right (NW-SE \)
};

function buildHCLines(strand: Knot, margin: number, cellSize: number, xLeft: number, xRight: number): HCLine[] {
  return strand.halfCycles.map((hc, i) => {
    const fromY = pinToY(hc.fromPin, strand.bights, margin, cellSize);
    const toY = pinToY(hc.toPin, strand.bights, margin, cellSize);
    const fromRight = i % 2 === 0;
    const from: Point = fromRight ? { x: xRight, y: fromY } : { x: xLeft, y: fromY };
    const to: Point = fromRight ? { x: xLeft, y: toY } : { x: xRight, y: toY };
    // A line is \ (NW-SE) if y increases as x increases.
    // fromRight: going left (x decreasing). \ means y decreases as x decreases → toY > fromY.
    // fromLeft: going right (x increasing). \ means toY > fromY.
    const isBackslash = toY > fromY;
    return { hc, hcIndex: i, from, to, isBackslash };
  });
}

// Point on line AB at distance d from B, toward A.
function clipBack(a: Point, b: Point, d: number): Point {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const t = d / len;
  return { x: b.x + dx * t, y: b.y + dy * t };
}

// Point on line AB at distance d from A, toward B.
function clipFwd(a: Point, b: Point, d: number): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const t = d / len;
  return { x: a.x + dx * t, y: a.y + dy * t };
}

type CrossingPoint = { x: number; y: number; isOver: boolean };

// Compute crossings by intersecting all right-going with all left-going HCs.
// isOver: whether the \ direction strand goes over at this crossing.
function computeCrossings(lines: HCLine[], strand: Knot, xLeft: number, xRight: number): CrossingPoint[] {
  const crossings: CrossingPoint[] = [];
  const { coding, sobre } = strand;
  const rightLines = lines.filter(l => l.hcIndex % 2 === 0);
  const leftLines = lines.filter(l => l.hcIndex % 2 === 1);

  for (const r of rightLines) {
    for (const l of leftLines) {
      const pt = lineIntersection(r.from, r.to, l.from, l.to);
      if (!pt) continue;
      if (pt.x <= xLeft + 0.5 || pt.x >= xRight - 0.5) continue;

      // Determine column for coding lookup.
      const cellSize = (xRight - xLeft) / (strand.parts - 1);
      const col = Math.floor((pt.x - xLeft) / cellSize);
      if (col < 0 || col >= coding.length) continue;

      // isBackslash: the \ line at this crossing.
      // The right-going line is \  if r.isBackslash, else the left-going line is \.
      // fromRight for isOver formula: the right-going HC is considered "fromRight".
      const ri = r.hcIndex;
      const row = ri / 2;
      const fromRight = row % 2 === 0;
      const isBackslash = coding[col] === '\\';
      const isOver = fromRight ? isBackslash !== sobre : isBackslash === sobre;

      crossings.push({ x: pt.x, y: pt.y, isOver });
    }
  }
  return crossings;
}

function render(
  ctx: CanvasRenderingContext2D,
  knot: InterweavedKnot,
  strandWidth: number,
  gapWidth: number,
  cellSize: number,
  margin: number,
  width: number,
  height: number
) {
  const r = cellSize / 2; // bight arc radius

  knot.strands.forEach((strand, si) => {
    const color = knot.strandColors[si];
    const xLeft = margin;
    const xRight = margin + (strand.parts - 1) * cellSize;

    const lines = buildHCLines(strand, margin, cellSize, xLeft, xRight);
    const crossings = computeCrossings(lines, strand, xLeft, xRight);

    // Two layers: \ lines + left bights, / lines + right bights.
    const bsCanvas = new OffscreenCanvas(width, height);
    const bsCtx = bsCanvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
    const slCanvas = new OffscreenCanvas(width, height);
    const slCtx = slCanvas.getContext('2d') as OffscreenCanvasRenderingContext2D;

    // Draw each HC line clipped r back from both endpoints (bight arc handles the last r).
    bsCtx.save();
    bsCtx.strokeStyle = color;
    bsCtx.lineWidth = strandWidth;
    bsCtx.lineCap = 'butt';
    slCtx.save();
    slCtx.strokeStyle = color;
    slCtx.lineWidth = strandWidth;
    slCtx.lineCap = 'butt';

    for (const line of lines) {
      const drawCtx = line.isBackslash ? bsCtx : slCtx;
      const clippedFrom = clipFwd(line.from, line.to, r);
      const clippedTo = clipBack(line.from, line.to, r);
      drawCtx.beginPath();
      drawCtx.moveTo(clippedFrom.x, clippedFrom.y);
      drawCtx.lineTo(clippedTo.x, clippedTo.y);
      drawCtx.stroke();
    }

    bsCtx.restore();
    slCtx.restore();

    // Draw bight arcs. Consecutive HCs share a pin at an edge — draw the arc there.
    bsCtx.save();
    bsCtx.strokeStyle = color;
    bsCtx.lineWidth = strandWidth;
    bsCtx.lineCap = 'round';
    slCtx.save();
    slCtx.strokeStyle = color;
    slCtx.lineWidth = strandWidth;
    slCtx.lineCap = 'round';

    const hcs = strand.halfCycles;

    // Interior bights: HC[i] end / HC[i+1] start shared pin.
    for (let i = 0; i < hcs.length - 1; i++) {
      const pinY = pinToY(hcs[i].toPin, strand.bights, margin, cellSize);
      const endsOnLeft = i % 2 === 0; // even HC starts from right → ends on left
      const cx = endsOnLeft ? xLeft : xRight;

      // Clip points on the two adjacent lines (angle from center to each clip point).
      const lineA = lines[i]; // the line ending here
      const lineB = lines[i + 1]; // the line starting here

      const clipA = clipBack(lineA.from, lineA.to, r);
      const clipB = clipFwd(lineB.from, lineB.to, r);

      const startAngle = Math.atan2(clipA.y - pinY, clipA.x - cx);
      const endAngle = Math.atan2(clipB.y - pinY, clipB.x - cx);

      // Determine which layer gets this bight based on which direction curves outward.
      const drawCtx = endsOnLeft ? bsCtx : slCtx;
      const anticlockwise = endsOnLeft; // left bights go counterclockwise (API) = curves left
      drawCtx.beginPath();
      drawCtx.arc(cx, pinY, r, startAngle, endAngle, anticlockwise);
      drawCtx.stroke();
    }

    // Terminal bight: HC[0] start and HC[last] end share a pin (strand loop closes).
    {
      const firstLine = lines[0];
      const lastLine = lines[hcs.length - 1];
      const pinY = pinToY(hcs[0].fromPin, strand.bights, margin, cellSize);
      // HC[0] starts from right edge; HC[last] (odd index) ends on right edge.
      const cx = xRight;
      const clipFirst = clipFwd(firstLine.from, firstLine.to, r);
      const clipLast = clipBack(lastLine.from, lastLine.to, r);
      const startAngle = Math.atan2(clipLast.y - pinY, clipLast.x - cx);
      const endAngle = Math.atan2(clipFirst.y - pinY, clipFirst.x - cx);
      slCtx.beginPath();
      slCtx.arc(cx, pinY, r, startAngle, endAngle, false); // right bight curves right
      slCtx.stroke();
    }

    bsCtx.restore();
    slCtx.restore();

    // Punch gaps: \ over → erase from / layer; / over → erase from \ layer.
    const overSlash = crossings.filter(c => c.isOver);
    const overBackslash = crossings.filter(c => !c.isOver);
    punchGaps(bsCtx, overBackslash, strandWidth, gapWidth, true);
    punchGaps(slCtx, overSlash, strandWidth, gapWidth, false);

    ctx.drawImage(bsCanvas, 0, 0);
    ctx.drawImage(slCanvas, 0, 0);
  });
}

function punchGaps(
  ctx: OffscreenCanvasRenderingContext2D,
  crossings: CrossingPoint[],
  strandWidth: number,
  gapWidth: number,
  isBackslashLayer: boolean
) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';

  for (const cp of crossings) {
    ctx.save();
    ctx.translate(cp.x, cp.y);
    // x-axis aligned with layer strand direction; fillRect cuts across.
    ctx.rotate(isBackslashLayer ? Math.PI / 4 : -Math.PI / 4);
    ctx.fillRect(-strandWidth / 2 - 1, -gapWidth, strandWidth + 2, gapWidth * 2);
    ctx.restore();
  }

  ctx.restore();
}
