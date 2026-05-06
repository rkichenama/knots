import * as React from 'react';
import styled from 'styled-components';
import { InterweavedKnot } from '../lib/interweaved-knot';
import { lineIntersection, Point } from '../lib/knotPath';
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

// Full-knot pin y-coordinate. pin 1-indexed (1=bottom, fullBights=top).
function pinToY(pin: number, fullBights: number, margin: number, cellSize: number): number {
  return margin + (fullBights - pin) * cellSize + cellSize / 2;
}

// Sub-knot pin p of strand si → full-knot pin number.
function toFullPin(subPin: number, si: number, numStrands: number): number {
  return si + numStrands * (subPin - 1) + 1;
}

type FullLine = {
  strandIndex: number;
  hcIndex: number;
  from: Point;
  to: Point;
  isBackslash: boolean; // y increases as x increases (NW-SE)
  strand: Knot;
};

type CrossingPoint = { x: number; y: number; isOver: boolean };

// Point on AB at distance d from A toward B.
function along(a: Point, b: Point, d: number): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const t = d / len;
  return { x: a.x + dx * t, y: a.y + dy * t };
}

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
  const { numStrands } = knot;
  const fullBights = knot.bights;
  const r = cellSize / 2; // bight arc radius = half cell

  // Extra vertical canvas space so strands near top/bottom pins don't clip.
  const overflow = cellSize * fullBights;
  const ow = width;
  const oh = height + 2 * overflow;
  // y-offset: content starts at `overflow` in the offscreen canvas.
  const oy = overflow;

  // Build all HC lines in full-knot coordinates across all strands.
  const xLeft = margin;
  const xRight = margin + (knot.parts - 1) * cellSize;

  const allLines: FullLine[] = [];

  knot.strands.forEach((strand, si) => {
    strand.halfCycles.forEach((hc, hci) => {
      const fromFullPin = toFullPin(hc.fromPin, si, numStrands);
      const toFullPin_ = toFullPin(hc.toPin, si, numStrands);
      const fromY = pinToY(fromFullPin, fullBights, margin + oy, cellSize);
      const toY = pinToY(toFullPin_, fullBights, margin + oy, cellSize);
      const fromRight = hci % 2 === 0;
      const from: Point = fromRight ? { x: xRight, y: fromY } : { x: xLeft, y: fromY };
      const to: Point = fromRight ? { x: xLeft, y: toY } : { x: xRight, y: toY };
      const isBackslash = toY > fromY;
      allLines.push({ strandIndex: si, hcIndex: hci, from, to, isBackslash, strand });
    });
  });

  // Compute all crossings between right-going and left-going lines across all strands.
  const rightLines = allLines.filter(l => l.hcIndex % 2 === 0);
  const leftLines = allLines.filter(l => l.hcIndex % 2 === 1);

  const crossings: CrossingPoint[] = [];
  for (const rl of rightLines) {
    for (const ll of leftLines) {
      const pt = lineIntersection(rl.from, rl.to, ll.from, ll.to);
      if (!pt) continue;
      if (pt.x <= xLeft + 0.5 || pt.x >= xRight - 0.5) continue;

      // isOver from the strand's coding. Use rl.strand coding (same coding for all strands).
      const { coding, sobre } = rl.strand;
      const col = Math.floor((pt.x - xLeft) / cellSize);
      if (col < 0 || col >= coding.length) continue;

      const row = rl.hcIndex / 2;
      const fromRight = row % 2 === 0;
      const isBackslash = coding[col] === '\\';
      const isOver = fromRight ? isBackslash !== sobre : isBackslash === sobre;

      crossings.push({ x: pt.x, y: pt.y, isOver });
    }
  }

  // Two offscreen canvases (with overflow): \ layer and / layer.
  const bsCanvas = new OffscreenCanvas(ow, oh);
  const bsCtx = bsCanvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
  const slCanvas = new OffscreenCanvas(ow, oh);
  const slCtx = slCanvas.getContext('2d') as OffscreenCanvasRenderingContext2D;

  // Draw HC lines (clipped r from each end) onto the appropriate layer.
  for (const lyr of [
    { oc: bsCtx, bs: true },
    { oc: slCtx, bs: false },
  ]) {
    lyr.oc.save();
    lyr.oc.lineWidth = strandWidth;
    lyr.oc.lineCap = 'butt';
    for (const line of allLines) {
      if (line.isBackslash !== lyr.bs) continue;
      const color = knot.strandColors[line.strandIndex];
      lyr.oc.strokeStyle = color;
      const clippedFrom = along(line.from, line.to, r);
      const clippedTo = along(line.to, line.from, r);
      lyr.oc.beginPath();
      lyr.oc.moveTo(clippedFrom.x, clippedFrom.y);
      lyr.oc.lineTo(clippedTo.x, clippedTo.y);
      lyr.oc.stroke();
    }
    lyr.oc.restore();
  }

  // Draw bight arcs per strand (consecutive HCs share a pin at an edge).
  knot.strands.forEach((strand, si) => {
    const color = knot.strandColors[si];
    const hcs = strand.halfCycles;
    const strandLines = allLines.filter(l => l.strandIndex === si);

    for (const oc of [bsCtx, slCtx]) {
      oc.save();
      oc.strokeStyle = color;
      oc.lineWidth = strandWidth;
      oc.lineCap = 'round';
      oc.restore();
    }

    const drawBight = (cx: number, pinY: number, lineA: FullLine, lineB: FullLine, onLeft: boolean) => {
      const clipA = along(lineA.to, lineA.from, r); // r back from lineA end
      const clipB = along(lineB.from, lineB.to, r); // r fwd from lineB start
      const startAngle = Math.atan2(clipA.y - pinY, clipA.x - cx);
      const endAngle = Math.atan2(clipB.y - pinY, clipB.x - cx);
      // Left bight: curves left = counterclockwise in canvas (anticlockwise=true).
      // Right bight: curves right = clockwise (anticlockwise=false).
      const oc = onLeft ? bsCtx : slCtx;
      oc.save();
      oc.strokeStyle = color;
      oc.lineWidth = strandWidth;
      oc.lineCap = 'round';
      oc.beginPath();
      oc.arc(cx, pinY, r, startAngle, endAngle, onLeft);
      oc.stroke();
      oc.restore();
    };

    // Interior bights between consecutive HCs.
    for (let i = 0; i < hcs.length - 1; i++) {
      const fromFullPin_ = toFullPin(hcs[i].toPin, si, numStrands);
      const py = pinToY(fromFullPin_, fullBights, margin + oy, cellSize);
      const endsOnLeft = i % 2 === 0;
      const cx = endsOnLeft ? xLeft : xRight;
      drawBight(cx, py, strandLines[i], strandLines[i + 1], endsOnLeft);
    }

    // Terminal bight: HC[0] start = HC[last] end (strand loops).
    {
      const fromFullPin_ = toFullPin(hcs[0].fromPin, si, numStrands);
      const py = pinToY(fromFullPin_, fullBights, margin + oy, cellSize);
      // HC[0] even → starts from right; HC[last] odd → ends on right.
      drawBight(xRight, py, strandLines[strandLines.length - 1], strandLines[0], false);
    }
  });

  // Punch gaps: \ over → erase / layer; / over → erase \ layer.
  for (const [oc, isBackslashLayer] of [
    [bsCtx, true],
    [slCtx, false],
  ] as [OffscreenCanvasRenderingContext2D, boolean][]) {
    oc.save();
    oc.globalCompositeOperation = 'destination-out';
    for (const cp of crossings) {
      const isUnder = isBackslashLayer ? !cp.isOver : cp.isOver;
      if (!isUnder) continue;
      oc.save();
      oc.translate(cp.x, cp.y);
      oc.rotate(isBackslashLayer ? Math.PI / 4 : -Math.PI / 4);
      oc.fillRect(-strandWidth / 2 - 1, -gapWidth, strandWidth + 2, gapWidth * 2);
      oc.restore();
    }
    oc.restore();
  }

  // Mask: clear the overflow region and outside border.
  for (const oc of [bsCtx, slCtx]) {
    oc.save();
    oc.globalCompositeOperation = 'destination-out';
    // Clear above and below the visible knot area.
    oc.fillRect(0, 0, ow, oy);
    oc.fillRect(0, oy + height, ow, oy);
    // Clear left and right margins beyond the knot border.
    oc.fillRect(0, oy, margin, height);
    oc.fillRect(xRight + margin, oy, margin, height);
    oc.restore();
  }

  // Composite both layers onto main canvas, offset by -oy.
  ctx.drawImage(bsCanvas, 0, -oy);
  ctx.drawImage(slCanvas, 0, -oy);
}
