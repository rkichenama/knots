import { InterweavedKnot } from './interweaved-knot';
import { Point } from './tying-logic';

export type MandrelMetrics = {
  strandWidth: number;
  gapWidth: number;
  cellSize: number;
  margin: number;
  pinRadius: number;
  outlineWidth: number;
};

export type MandrelPin = Point & {
  strandIndex: number;
  pinNumber: number; // 0-indexed within that strand's bight sequence
};

export type MandrelLine = {
  from: MandrelPin;
  to: MandrelPin;
  strandIndex: number;
  isBackslash: boolean;
  isFreeRun: boolean;
};

export type MandrelCrossing = {
  x: number;
  y: number;
  backslashLine: MandrelLine;
  slashLine: MandrelLine;
  isBackslashOver: boolean;
};

export function makeMandrelMetrics(strandWidth: number, gapWidth: number): MandrelMetrics {
  const cellSize = strandWidth + gapWidth;
  return {
    strandWidth,
    gapWidth,
    cellSize,
    margin: cellSize * 2,
    pinRadius: gapWidth / 2,
    outlineWidth: 2,
  };
}

export function getPinPositions(
  knot: InterweavedKnot,
  m: MandrelMetrics
): { left: MandrelPin[]; right: MandrelPin[] } {
  const totalPins = knot.numStrands * knot.bights;
  const mandrelWidth = (knot.parts - 1) * m.cellSize;
  const isOddParts = knot.parts % 2 !== 0;

  const left: MandrelPin[] = [];
  const right: MandrelPin[] = [];

  for (let p = 0; p < totalPins; p++) {
    const strandIndex = p % knot.numStrands;
    const pinNumber = Math.floor(p / knot.numStrands);
    const y = m.margin + p * m.cellSize + m.cellSize / 2;

    left.push({ x: m.margin, y, strandIndex, pinNumber });
    right.push({
      x: m.margin + mandrelWidth,
      y: isOddParts ? y - m.cellSize / 2 : y,
      strandIndex,
      pinNumber,
    });
  }

  return { left, right };
}
