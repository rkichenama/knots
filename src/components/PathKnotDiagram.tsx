import * as React from 'react';
import styled from 'styled-components';
import { Knot } from '../lib/knot';
import { InterweavedKnot } from '../lib/interweaved-knot';
import { lineIntersection, Point } from '../lib/knotPath';
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

// pin is 1-indexed (1=bottom, bights=top). Canvas y increases downward.
function pinToY(pin: number, bights: number, margin: number, cellSize: number): number {
  return margin + (bights - pin) * cellSize + cellSize / 2;
}

// Return the two edge endpoints for a half-cycle diagonal.
// Even HC index → starts from right edge; odd → starts from left edge.
function hcEndpoints(
  hc: HalfCycle,
  hcIndex: number,
  bights: number,
  margin: number,
  cellSize: number,
  xLeft: number,
  xRight: number
): { from: Point; to: Point } {
  const fromY = pinToY(hc.fromPin, bights, margin, cellSize);
  const toY = pinToY(hc.toPin, bights, margin, cellSize);
  const fromRight = hcIndex % 2 === 0;
  return fromRight
    ? { from: { x: xRight, y: fromY }, to: { x: xLeft, y: toY } }
    : { from: { x: xLeft, y: fromY }, to: { x: xRight, y: toY } };
}

type CrossingPoint = { x: number; y: number; isOver: boolean };

// Compute all crossing positions by intersecting every right-going HC with every left-going HC.
// Right HCs: even indices (start from right edge).
// Left HCs: odd indices (start from left edge).
// Each crossing's x determines which coding column applies; isOver from coding + sobre.
function computeCrossings(
  strand: Knot,
  bights: number,
  margin: number,
  cellSize: number,
  xLeft: number,
  xRight: number
): CrossingPoint[] {
  const crossings: CrossingPoint[] = [];
  const hcs = strand.halfCycles;
  const { coding, sobre } = strand;

  const rightHCs = hcs.map((hc, i) => ({ hc, i })).filter(({ i }) => i % 2 === 0);
  const leftHCs = hcs.map((hc, i) => ({ hc, i })).filter(({ i }) => i % 2 === 1);

  for (const { hc: rHC, i: ri } of rightHCs) {
    const a = hcEndpoints(rHC, ri, bights, margin, cellSize, xLeft, xRight);
    for (const { hc: lHC, i: li } of leftHCs) {
      const b = hcEndpoints(lHC, li, bights, margin, cellSize, xLeft, xRight);
      const pt = lineIntersection(a.from, a.to, b.from, b.to);
      if (!pt) continue;

      // Determine which column this crossing falls in.
      const col = Math.round((pt.x - margin) / cellSize - 0.5);
      if (col < 0 || col >= coding.length) continue;

      // Row parity: which HC pair this belongs to determines fromRight for isOver.
      // Right HC (even index ri): the right-going strand is the \ direction in even rows.
      // fromRight = true when the right-going pass is in the \ direction.
      // Use ri/2 as the "row index" for the right HC.
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
  const offscreens = knot.strands.map(() => new OffscreenCanvas(width, height));

  knot.strands.forEach((strand, si) => {
    const oc = offscreens[si];
    const octx = oc.getContext('2d') as OffscreenCanvasRenderingContext2D;
    const color = knot.strandColors[si];

    const xLeft = margin;
    const xRight = margin + (strand.parts - 1) * cellSize;
    const bights = strand.bights;

    const crossings = computeCrossings(strand, bights, margin, cellSize, xLeft, xRight);

    drawStrands(octx, strand, bights, margin, cellSize, xLeft, xRight, strandWidth, color);
    drawBightCurves(octx, strand, bights, margin, cellSize, xLeft, xRight, strandWidth, color);
    punchCrossingGaps(octx, crossings, strandWidth, gapWidth);
  });

  knot.strands.forEach((_strand, si) => {
    ctx.drawImage(offscreens[si], 0, 0);
  });
}

// Draw each half-cycle as a diagonal line from its start edge pin to its end edge pin.
function drawStrands(
  ctx: OffscreenCanvasRenderingContext2D,
  strand: Knot,
  bights: number,
  margin: number,
  cellSize: number,
  xLeft: number,
  xRight: number,
  strandWidth: number,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = strandWidth;
  ctx.lineCap = 'butt';

  strand.halfCycles.forEach((hc, i) => {
    const { from, to } = hcEndpoints(hc, i, bights, margin, cellSize, xLeft, xRight);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  });

  ctx.restore();
}

// Draw bight curves connecting consecutive half-cycle endpoints at shared edge pins.
// HC[n] ends at the same pin that HC[n+1] starts from.
function drawBightCurves(
  ctx: OffscreenCanvasRenderingContext2D,
  strand: Knot,
  bights: number,
  margin: number,
  cellSize: number,
  xLeft: number,
  xRight: number,
  strandWidth: number,
  color: string
) {
  const r = cellSize / 2;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = strandWidth;
  ctx.lineCap = 'round';

  const hcs = strand.halfCycles;

  // Bight at HC[n] end / HC[n+1] start (shared pin, same edge).
  for (let i = 0; i < hcs.length - 1; i++) {
    const sharedPin = hcs[i].toPin; // == hcs[i+1].fromPin
    const y = pinToY(sharedPin, bights, margin, cellSize);
    // HC[i] ends on: even i starts from right → ends on left; odd → ends on right.
    const endsOnLeft = i % 2 === 0;
    const x = endsOnLeft ? xLeft : xRight;

    ctx.beginPath();
    if (endsOnLeft) {
      // Curve outward left: clockwise arc from bottom→left→top.
      ctx.arc(x, y, r, Math.PI / 2, -Math.PI / 2, false);
    } else {
      // Curve outward right: clockwise arc from top→right→bottom.
      ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2, false);
    }
    ctx.stroke();
  }

  // Terminal bight: HC[0] start and HC[last] end share a pin (the strand loops).
  // Both land on the right edge (HC[0] even → right, HC[last] odd → ends right).
  // Draw one bight at that shared pin on the right edge.
  const termY = pinToY(hcs[0].fromPin, bights, margin, cellSize);
  ctx.beginPath();
  ctx.arc(xRight, termY, r, -Math.PI / 2, Math.PI / 2, false);
  ctx.stroke();

  ctx.restore();
}

// Punch gaps at under-crossing points along the under-strand direction.
function punchCrossingGaps(
  ctx: OffscreenCanvasRenderingContext2D,
  crossings: CrossingPoint[],
  strandWidth: number,
  gapWidth: number
) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';

  for (const cp of crossings) {
    ctx.save();
    ctx.translate(cp.x, cp.y);
    // isOver=true: \ over, punch / under → rotate -45° (x-axis → NE = / direction)
    // isOver=false: / over, punch \ under → rotate +45° (x-axis → SE = \ direction)
    ctx.rotate(cp.isOver ? -Math.PI / 4 : Math.PI / 4);
    ctx.fillRect(-strandWidth / 2 - 1, -gapWidth, strandWidth + 2, gapWidth * 2);
    ctx.restore();
  }

  ctx.restore();
}
