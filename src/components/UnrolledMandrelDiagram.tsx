import * as React from 'react';
import styled from 'styled-components';
import { InterweavedKnot } from '../lib/interweaved-knot';
import {
  makeMandrelMetrics,
  getPinPositions,
  getHalfCycleLines,
  getCrossings,
  MandrelLine,
  MandrelPin,
} from '../lib/unrolled-mandrel';

type Props = {
  knot: InterweavedKnot;
  strandWidth?: number;
  gapWidth?: number;
};

const Container = styled.div`
  position: relative;
  border: 1px solid #ccc;
  background: #fff;
  overflow: hidden;
  resize: both;
`;

const Canvas = styled.canvas`
  display: block;
`;

export const UnrolledMandrelDiagram: React.FC<Props> = ({
  knot,
  strandWidth = 12,
  gapWidth = 4,
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const m = makeMandrelMetrics(strandWidth, gapWidth);
    const totalPins = knot.numStrands * knot.bights;
    const mandrelWidth = (knot.parts - 1) * m.cellSize;
    const canvasWidth = mandrelWidth + 2 * m.margin;
    const canvasHeight = totalPins * m.cellSize + 2 * m.margin;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const lines = getHalfCycleLines(knot, m);
    const crossings = getCrossings(lines, knot, m);

    // Two offscreen canvases: one for \ lines, one for / lines
    const bsCanvas = document.createElement('canvas');
    bsCanvas.width = canvasWidth;
    bsCanvas.height = canvasHeight;
    const bsCtx = bsCanvas.getContext('2d')!;

    const slCanvas = document.createElement('canvas');
    slCanvas.width = canvasWidth;
    slCanvas.height = canvasHeight;
    const slCtx = slCanvas.getContext('2d')!;

    // Draw one diagonal line segment: outline pass (black wider) then color pass
    const drawLine = (offCtx: CanvasRenderingContext2D, line: MandrelLine, color: string) => {
      const arcR = m.pinRadius + m.strandWidth / 2;
      const dx = line.to.x - line.from.x;
      const dy = line.to.y - line.from.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const ux = dx / len;
      const uy = dy / len;

      // Trim endpoints by arc radius so diagonal meets arc tangent
      const startX = line.from.x + ux * arcR;
      const startY = line.from.y + uy * arcR;
      const endX = line.to.x - ux * arcR;
      const endY = line.to.y - uy * arcR;

      // Outline pass (black, wider)
      offCtx.beginPath();
      offCtx.strokeStyle = '#000';
      offCtx.lineWidth = m.strandWidth + m.outlineWidth * 2;
      offCtx.lineCap = 'butt';
      offCtx.moveTo(startX, startY);
      offCtx.lineTo(endX, endY);
      offCtx.stroke();

      // Color pass
      offCtx.beginPath();
      offCtx.strokeStyle = color;
      offCtx.lineWidth = m.strandWidth;
      offCtx.lineCap = 'butt';
      offCtx.moveTo(startX, startY);
      offCtx.lineTo(endX, endY);
      offCtx.stroke();
    };

    // Draw all lines to appropriate offscreen canvas
    lines.forEach(line => {
      const color = knot.strandColors[line.strandIndex];
      const offCtx = line.isBackslash ? bsCtx : slCtx;
      drawLine(offCtx, line, color);
    });

    // Gap punch: cut hole in the "under" layer at each crossing
    crossings.forEach(cp => {
      const underCtx = cp.isBackslashOver ? slCtx : bsCtx;
      const overLine = cp.isBackslashOver ? cp.backslashLine : cp.slashLine;

      const dx = overLine.to.x - overLine.from.x;
      const dy = overLine.to.y - overLine.from.y;
      const gapHalf = m.strandWidth / 2 + m.gapWidth;
      const punchW = m.strandWidth + m.outlineWidth * 2 + 2;

      underCtx.save();
      underCtx.globalCompositeOperation = 'destination-out';
      underCtx.translate(cp.x, cp.y);
      underCtx.rotate(Math.atan2(dy, dx));
      underCtx.fillRect(-gapHalf, -punchW / 2, gapHalf * 2, punchW);
      underCtx.restore();
    });

    // Composite onto main canvas
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(bsCanvas, 0, 0);
    ctx.drawImage(slCanvas, 0, 0);

  }, [knot, strandWidth, gapWidth]);

  return (
    <div>
      <h4>Unrolled Mandrel</h4>
      <Container>
        <Canvas ref={canvasRef} />
      </Container>
    </div>
  );
};
