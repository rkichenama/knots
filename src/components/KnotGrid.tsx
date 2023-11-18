import * as React from 'react';
import styled, { css } from 'styled-components';
import { CurrentKnot } from '../data/CurrentKnot';
import { Knot } from '../lib';

const theta = Math.PI / 6;
const tanTheta = Math.tan(theta);

export const KnotGrid = () => {
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const knot = CurrentKnot.value;

  React.useEffect(() => {
    if (!canvas.current || !knot) return;

    clearDrawing(canvas.current, knot);
    drawPinsAndGrid(canvas.current, knot);
    drawOverUnders(canvas.current, knot);

    // drawIsoGrid(canvas.current);
  }, [knot]);

  return (
    <div>
      <h3>Knot Diagram</h3>
      <ResizeContainer>
        <Canvas ref={canvas}></Canvas>
      </ResizeContainer>
    </div>
  );
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

const clearDrawing = (canvas: HTMLCanvasElement, knot: Knot) => {
  canvas.height = (knot.bights - 0.5) * 32;
  canvas.parentElement.style.height = `${canvas.height}px`;
  canvas.width = (2 * (16 / tanTheta)) * (knot.parts / 2);
  canvas.parentElement.style.width = `${canvas.width}px`;

  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, width, height);
};

const drawPinsAndGrid = (canvas: HTMLCanvasElement, knot: Knot) => {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const deltaY = height / (knot.bights - 0.5);
  const deltaX = (2 * ((deltaY / 2) / tanTheta));

  ctx.fillStyle = '#573c66';
  ctx.strokeStyle = 'black';
  ctx.textAlign = 'center';
  ctx.font = '10px sans-serif';
  const across = knot.parts / 2;
  const isOddParts = knot.parts % 2;
  for (let pin = 0; pin <= knot.bights; pin++) {
    // ctx.fillRect(5, height - ((pin * deltaY) - rightOffset), 1, 1);
    // ctx.fillRect(width - 5, height - (pin * deltaY), 1, 1);
    ctx.lineWidth = 1;
    for (let x = 0; x < Math.ceil(across); x++) {
      if (x === 0) {
        ctx.fillText(`${pin  + 1}`,
          x + 15, height - ((pin * deltaY) - 3));

        ctx.fillText(`${pin + 1}`,
          (across * deltaX) - 15, height - (((pin + (isOddParts * 0.5)) * deltaY) - 3));
      }
      // <
      ctx.beginPath();
      ctx.moveTo(
        (x * deltaX) + ((knot.parts / 2) * deltaX),
        height - ((pin - across) * deltaY),
      );
      ctx.lineTo(
        (x * deltaX),
        height - (pin * deltaY),
      );
      ctx.lineTo(
        (x * deltaX) + ((knot.parts / 2) * deltaX),
        height - ((pin + across) * deltaY),
      );
      ctx.stroke();
      ctx.closePath();
      // >
      ctx.beginPath();
      ctx.moveTo(
        (x * deltaX) - ((knot.parts / 2) * deltaX),
        height - ((pin - across) * deltaY),
      );
      ctx.lineTo(
        (x * deltaX),
        height - (pin * deltaY),
      );
      ctx.lineTo(
        (x * deltaX) - ((knot.parts / 2) * deltaX),
        height - ((pin + across) * deltaY),
      );
      ctx.stroke();
      ctx.closePath();
    }
  }
  ctx.clearRect(((across) * deltaX), 0, width - ((across) * deltaX), height);
};

const drawOverUnders = (canvas: HTMLCanvasElement, knot: Knot) => {
  const ctx = canvas.getContext('2d');
  const height = canvas.height;
  const deltaY = height / (knot.bights - 0.5);
  const deltaX = (2 * ((deltaY / 2) / tanTheta));
  ctx.strokeStyle = 'black';
  const across = knot.parts / 2;
  const isOddParts = knot.parts % 2;

  const w = (0.2 * deltaX);
  const h = (0.2 * deltaY);
  const leftCoords = (x: number, pin: number) => ([
    ((x + 0.40) * deltaX), height - ((pin + 0.6) * deltaY)
  ]);
  const rightCoords = (x: number, pin: number) => ([
    ((x + 0.90) * deltaX), height - (pin * deltaY) - 3
  ]);
  const Over = ([x, y]: number[]) => {
    ctx.clearRect( x, y, w, h );
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y + h);
    ctx.stroke();
    ctx.closePath();
  };
  const Under = ([x, y]: number[]) => {
    ctx.clearRect( x, y, w, h );
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x, y + h);
    ctx.stroke();
    ctx.closePath();
  };
  for (let pin = 0; pin < knot.bights; pin++) {
    // assume column coded
    ctx.lineWidth = 5;
    const coding = knot.coding.split('');
    for (let x = 0; x < Math.floor(across); x++) {
      const left = coding.shift();
      (left === '\\' ? Over : Under)(leftCoords(x, pin));

      if (
        isOddParts ||
        (x + 1 < across)
      ) {
        const right = coding.shift();
        (right === '\\' ? Over : Under)(rightCoords(x, pin));
      }
    }
  }
}