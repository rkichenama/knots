import * as React from 'react';
import styled from 'styled-components';
import { Knot } from '../lib/knot';
import { knotToGrid, CellType } from '../lib/knotTiles';

type Props = {
  knot: Knot;
  color: string;
  cellSize?: number;
  shadowColor?: string;
};

const ResizeContainer = styled.div`
  overflow: hidden;
  resize: auto;
`;

export const TileKnotDiagram: React.FC<Props> = ({
  knot,
  color,
  cellSize = 40,
  shadowColor = 'rgba(0,0,0,0.4)',
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cols = knot.parts + 1;
    const rows = knot.bights;
    canvas.width  = cols * cellSize;
    canvas.height = rows * cellSize;
    if (canvas.parentElement) {
      canvas.parentElement.style.width  = `${canvas.width}px`;
      canvas.parentElement.style.height = `${canvas.height}px`;
    }

    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const grid = knotToGrid(knot);

    // row 0 = bottom of knot, drawn at bottom of canvas
    for (let r = rows - 1; r >= 0; r--) {
      const visualRow = rows - 1 - r;
      for (let c = 0; c < cols; c++) {
        const x = c * cellSize;
        const y = visualRow * cellSize;
        drawCell(ctx, x, y, cellSize, color, shadowColor, grid[r][c]);
      }
    }
  }, [knot, color, cellSize, shadowColor]);

  return (
    <ResizeContainer>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </ResizeContainer>
  );
};

function drawCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  shadowColor: string,
  cell: CellType
) {
  switch (cell) {
    case 'CURVE_LEFT':   return drawCurveLeft(ctx, x, y, size, color);
    case 'CURVE_RIGHT':  return drawCurveRight(ctx, x, y, size, color);
    case 'CROSS_OVER_L': return drawCrossOverL(ctx, x, y, size, color, shadowColor);
    case 'CROSS_OVER_R': return drawCrossOverR(ctx, x, y, size, color, shadowColor);
    case 'STRAND_LR':    return drawStrandLR(ctx, x, y, size, color);
    case 'STRAND_RL':    return drawStrandRL(ctx, x, y, size, color);
    case 'EMPTY':        return;
  }
}

const ribbonWidth = (size: number) => size * 0.35;

function drawStrandRL(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = ribbonWidth(size);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + size, y + size);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.restore();
}

function drawStrandLR(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = ribbonWidth(size);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y + size);
  ctx.lineTo(x + size, y);
  ctx.stroke();
  ctx.restore();
}

function drawCurveLeft(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = ribbonWidth(size);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x + size * 0.5, y + size);
  ctx.quadraticCurveTo(x - size * 0.4, y + size * 0.5, x + size * 0.5, y);
  ctx.stroke();
  ctx.restore();
}

function drawCurveRight(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = ribbonWidth(size);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x + size * 0.5, y + size);
  ctx.quadraticCurveTo(x + size * 1.4, y + size * 0.5, x + size * 0.5, y);
  ctx.stroke();
  ctx.restore();
}

function drawCrossOverL(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  shadowColor: string
) {
  const rw = ribbonWidth(size);
  const gap = rw * 0.6;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = rw;
  ctx.lineCap = 'round';

  // under strand: bottom-left → top-right (/)
  ctx.beginPath();
  ctx.moveTo(x, y + size);
  ctx.lineTo(x + size, y);
  ctx.stroke();

  // gap at center
  ctx.clearRect(x + size / 2 - gap, y + size / 2 - gap, gap * 2, gap * 2);

  // over strand: bottom-right → top-left (\) with shadow
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = rw * 0.5;
  ctx.beginPath();
  ctx.moveTo(x + size, y + size);
  ctx.lineTo(x, y);
  ctx.stroke();

  ctx.restore();
}

function drawCrossOverR(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  shadowColor: string
) {
  const rw = ribbonWidth(size);
  const gap = rw * 0.6;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = rw;
  ctx.lineCap = 'round';

  // under strand: bottom-right → top-left (\)
  ctx.beginPath();
  ctx.moveTo(x + size, y + size);
  ctx.lineTo(x, y);
  ctx.stroke();

  // gap at center
  ctx.clearRect(x + size / 2 - gap, y + size / 2 - gap, gap * 2, gap * 2);

  // over strand: bottom-left → top-right (/) with shadow
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = rw * 0.5;
  ctx.beginPath();
  ctx.moveTo(x, y + size);
  ctx.lineTo(x + size, y);
  ctx.stroke();

  ctx.restore();
}
