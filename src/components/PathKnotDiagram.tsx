import * as React from 'react';
import styled from 'styled-components';
import { InterweavedKnot } from '../lib/interweaved-knot';
import { gridCrossings, GridCrossing } from '../lib/knotPath';

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
    const crossings = gridCrossings(strand, cellSize, margin);

    drawStrands(octx, strand.parts, strand.bights, cellSize, margin, strandWidth, color);
    drawBightCurves(octx, strand.parts, strand.bights, cellSize, margin, strandWidth, color);
    punchCrossingGaps(octx, crossings, strandWidth, gapWidth);
  });

  knot.strands.forEach((_strand, si) => {
    ctx.drawImage(offscreens[si], 0, 0);
  });
}

// Draw diagonal strand segments for each bight row.
// Each row has two sets of diagonals crossing at (parts-1) grid cells:
//   NW-SE (\) strand and NE-SW (/) strand.
// Both span the full interior width (margin to margin+(parts-1)*cellSize).
function drawStrands(
  ctx: OffscreenCanvasRenderingContext2D,
  parts: number,
  bights: number,
  cellSize: number,
  margin: number,
  strandWidth: number,
  color: string
) {
  const xLeft = margin;
  const xRight = margin + (parts - 1) * cellSize;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = strandWidth;
  ctx.lineCap = 'butt';

  for (let row = 0; row < bights; row++) {
    const yTop = margin + row * cellSize;
    const yBot = margin + (row + 1) * cellSize;

    // NW-SE (\): top-left to bottom-right
    ctx.beginPath();
    ctx.moveTo(xLeft, yTop);
    ctx.lineTo(xRight, yBot);
    ctx.stroke();

    // NE-SW (/): bottom-left to top-right
    ctx.beginPath();
    ctx.moveTo(xLeft, yBot);
    ctx.lineTo(xRight, yTop);
    ctx.stroke();
  }

  ctx.restore();
}

// Draw bight curves at left/right edges.
// Each row has one semicircular bight at each edge, centered at the row's mid-cell y.
// The arc spans from the row's top y to its bottom y, curving outward past the edge.
function drawBightCurves(
  ctx: OffscreenCanvasRenderingContext2D,
  parts: number,
  bights: number,
  cellSize: number,
  margin: number,
  strandWidth: number,
  color: string
) {
  const xLeft = margin;
  const xRight = margin + (parts - 1) * cellSize;
  const r = cellSize / 2;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = strandWidth;
  ctx.lineCap = 'round';

  for (let row = 0; row < bights; row++) {
    const yMid = margin + row * cellSize + r;

    // Left edge: clockwise (API) from bottom→left→top = curves outward left.
    ctx.beginPath();
    ctx.arc(xLeft, yMid, r, Math.PI / 2, -Math.PI / 2, false);
    ctx.stroke();

    // Right edge: semicircle curving right (clockwise from top to bottom).
    ctx.beginPath();
    ctx.arc(xRight, yMid, r, -Math.PI / 2, Math.PI / 2, false);
    ctx.stroke();
  }

  ctx.restore();
}

// Punch gaps at under-crossing points along the under-strand direction.
function punchCrossingGaps(
  ctx: OffscreenCanvasRenderingContext2D,
  crossings: GridCrossing[],
  strandWidth: number,
  gapWidth: number
) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';

  for (const cp of crossings) {
    ctx.save();
    ctx.translate(cp.x, cp.y);
    // isOver=true: NW-SE (\) is over, punch gap along NE-SW (/) direction = rotate -45°
    // isOver=false: NE-SW (/) is over, punch gap along NW-SE (\) direction = rotate +45°
    // Rotate so x-axis aligns with the under-strand direction, then punch across it.
    // isOver=true: \ over, punch / under → rotate -45° (x-axis → NE = / direction)
    // isOver=false: / over, punch \ under → rotate +45° (x-axis → SE = \ direction)
    ctx.rotate(cp.isOver ? -Math.PI / 4 : Math.PI / 4);
    // Width (along strand) covers the crossing zone; height (across strand) erases it.
    ctx.fillRect(-strandWidth / 2 - 1, -gapWidth, strandWidth + 2, gapWidth * 2);
    ctx.restore();
  }

  ctx.restore();
}
