import * as React from 'react';
import styled from 'styled-components';
import { InterweavedKnot } from '../lib/interweaved-knot';
import { gridCrossings, GridCrossing } from '../lib/knotPath';
import { Knot } from '../lib/knot';

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

    drawStrands(octx, strand, cellSize, margin, strandWidth, color);
    drawBightCurves(octx, strand, cellSize, margin, strandWidth, color);
    punchCrossingGaps(octx, crossings, strandWidth, gapWidth);
  });

  knot.strands.forEach((_strand, si) => {
    ctx.drawImage(offscreens[si], 0, 0);
  });
}

// Draw uniform diagonal grid: each bight row has two diagonals spanning full interior width.
// Row r: \ from (xLeft, margin+r*cellSize) to (xRight, margin+(r+1)*cellSize)
//         / from (xLeft, margin+(r+1)*cellSize) to (xRight, margin+r*cellSize)
function drawStrands(
  ctx: OffscreenCanvasRenderingContext2D,
  strand: Knot,
  cellSize: number,
  margin: number,
  strandWidth: number,
  color: string
) {
  const xLeft = margin;
  const xRight = margin + (strand.parts - 1) * cellSize;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = strandWidth;
  ctx.lineCap = 'butt';

  for (let row = 0; row < strand.bights; row++) {
    const yTop = margin + row * cellSize;
    const yBot = margin + (row + 1) * cellSize;

    ctx.beginPath();
    ctx.moveTo(xLeft, yTop);
    ctx.lineTo(xRight, yBot);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(xLeft, yBot);
    ctx.lineTo(xRight, yTop);
    ctx.stroke();
  }

  ctx.restore();
}

// Bight curves at left/right edges.
// Each row has one semicircle at each edge, centered at mid-cell y, curving outward.
// Left: clockwise arc (API) from bottom→left→top.
// Right: clockwise arc from top→right→bottom.
function drawBightCurves(
  ctx: OffscreenCanvasRenderingContext2D,
  strand: Knot,
  cellSize: number,
  margin: number,
  strandWidth: number,
  color: string
) {
  const xLeft = margin;
  const xRight = margin + (strand.parts - 1) * cellSize;
  const r = cellSize / 2;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = strandWidth;
  ctx.lineCap = 'round';

  for (let row = 0; row < strand.bights; row++) {
    const yMid = margin + row * cellSize + r;

    ctx.beginPath();
    ctx.arc(xLeft, yMid, r, Math.PI / 2, -Math.PI / 2, false);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(xRight, yMid, r, -Math.PI / 2, Math.PI / 2, false);
    ctx.stroke();
  }

  ctx.restore();
}

// Punch gaps at under-crossing points.
// After rotate: x-axis aligns with under-strand direction; fillRect cuts across it.
// isOver=true: \ over → punch / under → rotate -45° (x→NE = / direction)
// isOver=false: / over → punch \ under → rotate +45° (x→SE = \ direction)
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
    ctx.rotate(cp.isOver ? -Math.PI / 4 : Math.PI / 4);
    ctx.fillRect(-strandWidth / 2 - 1, -gapWidth, strandWidth + 2, gapWidth * 2);
    ctx.restore();
  }

  ctx.restore();
}
