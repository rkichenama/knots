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

const Canvas = styled.canvas`
  position: relative;
  height: 100%;
  width: 100%;
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
      <Canvas ref={canvasRef} />
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
  // Two layers per strand: \ diagonals + left bights, / diagonals + right bights.
  // Separating them lets punchGaps erase only the under-direction without touching the over-direction.
  knot.strands.forEach((strand, si) => {
    const color = knot.strandColors[si];
    const crossings = gridCrossings(strand, cellSize, margin);
    const overSlash = crossings.filter(c => c.isOver); // \ over: punch / layer
    const overBackslash = crossings.filter(c => !c.isOver); // / over: punch \ layer

    const bsCanvas = new OffscreenCanvas(width, height);
    const bsCtx = bsCanvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
    drawDiagonals(bsCtx, strand, cellSize, margin, strandWidth, color, true);
    drawEdgeBights(bsCtx, strand, cellSize, margin, strandWidth, color, true);
    punchGaps(bsCtx, overSlash, strandWidth, gapWidth, true);

    const slCanvas = new OffscreenCanvas(width, height);
    const slCtx = slCanvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
    drawDiagonals(slCtx, strand, cellSize, margin, strandWidth, color, false);
    drawEdgeBights(slCtx, strand, cellSize, margin, strandWidth, color, false);
    punchGaps(slCtx, overBackslash, strandWidth, gapWidth, false);

    ctx.drawImage(bsCanvas, 0, 0);
    ctx.drawImage(slCanvas, 0, 0);
  });
}

// Draw either \ or / diagonals across all bight rows.
// isBackslash=true: row r → (xLeft,yTop)→(xRight,yBot)
// isBackslash=false: row r → (xLeft,yBot)→(xRight,yTop)
function drawDiagonals(
  ctx: OffscreenCanvasRenderingContext2D,
  strand: Knot,
  cellSize: number,
  margin: number,
  strandWidth: number,
  color: string,
  isBackslash: boolean
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
    if (isBackslash) {
      ctx.moveTo(xLeft, yTop);
      ctx.lineTo(xRight, yBot);
    } else {
      ctx.moveTo(xLeft, yBot);
      ctx.lineTo(xRight, yTop);
    }
    ctx.stroke();
  }

  ctx.restore();
}

// Draw edge bight semicircles for one layer.
// \ layer gets left bights; / layer gets right bights.
function drawEdgeBights(
  ctx: OffscreenCanvasRenderingContext2D,
  strand: Knot,
  cellSize: number,
  margin: number,
  strandWidth: number,
  color: string,
  isBackslash: boolean
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
    if (isBackslash) {
      // Left bight: clockwise (API) from bottom→left→top.
      ctx.arc(xLeft, yMid, r, Math.PI / 2, -Math.PI / 2, false);
    } else {
      // Right bight: clockwise from top→right→bottom.
      ctx.arc(xRight, yMid, r, -Math.PI / 2, Math.PI / 2, false);
    }
    ctx.stroke();
  }

  ctx.restore();
}

// Punch gaps into the under-strand layer using destination-out.
// isBackslashLayer: the layer being punched contains \ lines.
// Punch orientation aligns with the layer's diagonal direction.
function punchGaps(
  ctx: OffscreenCanvasRenderingContext2D,
  crossings: GridCrossing[],
  strandWidth: number,
  gapWidth: number,
  isBackslashLayer: boolean
) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';

  for (const cp of crossings) {
    ctx.save();
    ctx.translate(cp.x, cp.y);
    // Align x-axis with the layer's strand direction, then cut across it (y-axis = gap width).
    // \ layer (isBackslashLayer=true): rotate +45° → x→SE = \ direction.
    // / layer (isBackslashLayer=false): rotate -45° → x→NE = / direction.
    ctx.rotate(isBackslashLayer ? Math.PI / 4 : -Math.PI / 4);
    ctx.fillRect(-strandWidth / 2 - 1, -gapWidth, strandWidth + 2, gapWidth * 2);
    ctx.restore();
  }

  ctx.restore();
}
