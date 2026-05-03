import * as React from 'react';
import styled from 'styled-components';
import { Knot } from '../lib';
import { clearDrawing } from './KnotGrid';

const theta = Math.PI / 6;
const tanTheta = Math.tan(theta);
const PAD = 16;

type Props = {
  strands: Knot[];
  colors: string[];
};

export const InterweavedDiagram: React.FC<Props> = ({ strands, colors }) => {
  const combinedCanvas = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (!combinedCanvas.current || !strands.length) return;

    const canvas = combinedCanvas.current;
    const first = strands[0];
    clearDrawing(canvas, first, colors[0]);
    drawPinsAndGridColored(canvas, first, colors[0]);
    drawOverUndersColored(canvas, first, colors[0]);

    for (let i = 1; i < strands.length; i++) {
      drawPinsAndGridColored(canvas, strands[i], colors[i]);
      drawOverUndersColored(canvas, strands[i], colors[i]);
    }
  }, [strands, colors]);

  return (
    <div>
      <h4>Combined Diagram</h4>
      <ResizeContainer>
        <canvas ref={combinedCanvas} style={{ position: 'relative', height: '100%', width: '100%' }} />
      </ResizeContainer>
      <div className="flex gap-2 mt-2 flex-wrap">
        {strands.map((knot, i) => (
          <IndividualStrand key={i} knot={knot} color={colors[i]} label={`Strand ${i + 1}`} />
        ))}
      </div>
    </div>
  );
};

const IndividualStrand: React.FC<{ knot: Knot; color: string; label: string }> = ({ knot, color, label }) => {
  const canvas = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (!canvas.current) return;
    clearDrawing(canvas.current, knot, color);
    drawPinsAndGridColored(canvas.current, knot, color);
    drawOverUndersColored(canvas.current, knot, color);
  }, [knot, color]);

  return (
    <div>
      <h5 style={{ color }}>{label}</h5>
      <ResizeContainer>
        <canvas ref={canvas} style={{ position: 'relative', height: '100%', width: '100%' }} />
      </ResizeContainer>
    </div>
  );
};

const ResizeContainer = styled.div`
  overflow: hidden;
  resize: auto;
`;

const drawPinsAndGridColored = (canvas: HTMLCanvasElement, knot: Knot, color: string) => {
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const width = canvas.width - PAD * 2;
  const height = canvas.height - PAD * 2;
  const deltaY = height / (knot.bights - 0.5);
  const deltaX = 2 * ((deltaY / 2) / tanTheta);

  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.textAlign = 'center';
  ctx.font = '10px sans-serif';
  const across = knot.parts / 2;
  const isOddParts = knot.parts % 2;

  for (let pin = 0; pin <= knot.bights; pin++) {
    ctx.lineWidth = 1;
    for (let x = 0; x < Math.ceil(across); x++) {
      if (x === 0) {
        ctx.fillText(`${pin + 1}`, x + 15, height - (pin * deltaY - 3));
        ctx.fillText(`${pin + 1}`, across * deltaX - 15, height - ((pin + isOddParts * 0.5) * deltaY - 3));
      }
      ctx.beginPath();
      ctx.moveTo(x * deltaX + (knot.parts / 2) * deltaX, height - (pin - across) * deltaY);
      ctx.lineTo(x * deltaX, height - pin * deltaY);
      ctx.lineTo(x * deltaX + (knot.parts / 2) * deltaX, height - (pin + across) * deltaY);
      ctx.stroke();
      ctx.closePath();
      ctx.beginPath();
      ctx.moveTo(x * deltaX - (knot.parts / 2) * deltaX, height - (pin - across) * deltaY);
      ctx.lineTo(x * deltaX, height - pin * deltaY);
      ctx.lineTo(x * deltaX - (knot.parts / 2) * deltaX, height - (pin + across) * deltaY);
      ctx.stroke();
      ctx.closePath();
    }
  }
  ctx.clearRect(across * deltaX, 0, width - across * deltaX, height);
};

const drawOverUndersColored = (canvas: HTMLCanvasElement, knot: Knot, color: string) => {
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const height = canvas.height - PAD * 2;
  const deltaY = height / (knot.bights - 0.5);
  const deltaX = 2 * ((deltaY / 2) / tanTheta);
  ctx.strokeStyle = color;
  const across = knot.parts / 2;
  const isOddParts = knot.parts % 2;

  const w = 0.2 * deltaX;
  const h = 0.2 * deltaY;
  const leftCoords = (x: number, pin: number) => [(x + 0.4) * deltaX, height - (pin + 0.6) * deltaY];
  const rightCoords = (x: number, pin: number) => [(x + 0.9) * deltaX, height - pin * deltaY - 3];

  const Over = ([x, y]: number[]) => {
    ctx.clearRect(x, y, w, h);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.stroke(); ctx.closePath();
  };
  const Under = ([x, y]: number[]) => {
    ctx.clearRect(x, y, w, h);
    ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x, y + h); ctx.stroke(); ctx.closePath();
  };

  for (let pin = 0; pin < knot.bights; pin++) {
    ctx.lineWidth = 5;
    const coding = knot.coding.split('');
    for (let x = 0; x < Math.floor(across); x++) {
      const left = coding.shift();
      (left === '\\' ? Over : Under)(leftCoords(x, pin));
      if (isOddParts || x + 1 < across) {
        const right = coding.shift();
        (right === '\\' ? Over : Under)(rightCoords(x, pin));
      }
    }
  }
};
