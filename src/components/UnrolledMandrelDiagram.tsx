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

    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Placeholder grid lines to verify sizing
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    for (let p = 0; p < totalPins; p++) {
      const y = m.margin + p * m.cellSize + m.cellSize / 2;
      ctx.beginPath();
      ctx.moveTo(m.margin, y);
      ctx.lineTo(m.margin + mandrelWidth, y);
      ctx.stroke();
    }

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
