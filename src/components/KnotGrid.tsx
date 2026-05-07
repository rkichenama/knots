import * as React from 'react';
import styled from 'styled-components';
import { CurrentKnot } from '../data/CurrentKnot';
import { Knot } from '../lib';

const theta = Math.PI / 6;
const tanTheta = Math.tan(theta);
const PAD = 16;

type KnotGridProps = { knot?: Knot; color?: string };

export const KnotGrid = ({ knot: knotProp, color }: KnotGridProps = {}) => {
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const knot = knotProp ?? CurrentKnot.value;

  React.useEffect(() => {
    if (!canvas.current || !knot) return;

    clearDrawing(canvas.current, knot, color);
    drawPinsAndGrid(canvas.current, knot);
    drawOverUnders(canvas.current, knot);
    drawBorders(canvas.current);

    // drawIsoGrid(canvas.current);
  }, [knot, color]);

  return (
    <div>
      <h4>Knot Diagram</h4>
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

export const clearDrawing = (canvas: HTMLCanvasElement, knot: Knot, strokeColor?: string) => {
  canvas.height = (knot.bights - 0.5) * 32 + PAD * 2;
  canvas.parentElement!.style.height = `${canvas.height}px`;
  canvas.width = (2 * (16 / tanTheta)) * (knot.parts / 2) + PAD * 2;
  canvas.parentElement!.style.width = `${canvas.width}px`;

  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);
  ctx.setTransform(1, 0, 0, 1, PAD, PAD);
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = strokeColor;
  }
};

const drawPinsAndGrid = (canvas: HTMLCanvasElement, knot: Knot) => {
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const width = canvas.width - PAD * 2;
  const height = canvas.height - PAD * 2;
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
        ctx.fillText(`${(pin % knot.bights)  + 1}`,
          x + 15, height - ((pin * deltaY) - 3));

        ctx.fillText(`${(pin % knot.bights) + 1}`,
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
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const height = canvas.height - PAD * 2;
  const deltaY = height / (knot.bights - 0.5);
  const deltaX = (2 * ((deltaY / 2) / tanTheta));
  ctx.strokeStyle = 'black';
  const across = knot.parts / 2;
  const isOddParts = knot.parts % 2;

  const w = (.3 * deltaX);
  const h = (.3 * deltaY);
  const leftCoords = (x: number, pin: number) => ([
    ((x + 0.29) * deltaX), height - ((pin + 0.7) * deltaY)
  ]);
  const rightCoords = (x: number, pin: number) => ([
    ((x + 0.87) * deltaX), height - (pin * deltaY) - 5
  ]);
  const setupCross = (x: number, y: number) => {
    ctx.lineWidth = 5;
    ctx.clearRect( x, y, w, h );
    ctx.beginPath();
  };
  const finishCross = () => {
    ctx.stroke();
    ctx.closePath();
  };
  const O = ([x, y]: number[]) => {
    setupCross(x, y);
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y + h);
    finishCross();
  };
  const U = ([x, y]: number[]) => {
    setupCross(x, y);
    ctx.moveTo(x + w, y);
    ctx.lineTo(x, y + h);
    finishCross();
  };
  const Over = knot.sobre ? U : O;
  const Under = knot.sobre ? O : U;
  for (let pin = 0; pin <= knot.bights; pin++) {
    // assume column coded
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
};

const drawBorders = (canvas: HTMLCanvasElement) => {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

  // horizontal
  // ctx.clearRect(-PAD, -PAD, width, PAD - 4);
  ctx.clearRect(-PAD, height - (2 * PAD), width, PAD);
  // vertical
  ctx.clearRect(-PAD, - PAD, PAD, height);
  ctx.clearRect(width - (2 * PAD), - PAD, PAD, height);
};