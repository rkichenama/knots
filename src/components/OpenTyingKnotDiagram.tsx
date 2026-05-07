import * as React from 'react';
import styled from 'styled-components';
import { InterweavedKnot } from '../lib/interweaved-knot';
import { lineIntersection, Point } from '../lib/tying-logic';
import { Knot } from '../lib/knot';

const TAN_THETA = Math.tan(Math.PI / 6);

type Props = {
  knot: InterweavedKnot;
  strandWidth: number;
  gapWidth: number;
};

const Container = styled.div`
  position: relative;
  width: 100%;
  border: 1px solid #ccc;
  background: #fff;
  overflow: hidden;
  resize: auto;
`;

const Canvas = styled.canvas`
  display: block;
  width: 100%;
  height: 100%;
`;

type FullLine = {
  strandIndex: number;
  hcIndex: number;
  from: Point;
  to: Point;
  isBackslash: boolean;
  strand: Knot;
};

type Segment = {
  strandIndex: number;
  hcIndex: number;
  runIndex: number;
  runType: 'O' | 'U';
  from: Point;
  to: Point;
  isBackslash: boolean;
  strand: Knot;
};

type CrossingPoint = {
  x: number;
  y: number;
  isOver: boolean;
};

function pinToY(
  pin: number,
  fullBights: number,
  margin: number,
  cellSize: number,
  isRightAndOdd: boolean
): number {
  let y = margin + (fullBights - pin) * cellSize + cellSize / 2;
  if (isRightAndOdd) {
    y -= cellSize / 2;
  }
  return y;
}

function toFullPin(subPin: number, si: number, numStrands: number): number {
  return si + numStrands * (subPin - 1) + 1;
}

function along(a: Point, b: Point, d: number): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1e-10) return a;
  return { x: a.x + dx * (d / len), y: a.y + dy * (d / len) };
}

export const OpenTyingKnotDiagram: React.FC<Props> = ({ knot, strandWidth, gapWidth }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = strandWidth + gapWidth;
    const margin = cellSize * 2;
    const deltaX = cellSize / TAN_THETA;
    const fullBights = knot.bights;
    const { numStrands } = knot;
    const fullParts = knot.parts;
    const r = cellSize / 2;

    const width = fullParts * deltaX + 2 * margin;
    const height = (fullBights - 0.5) * cellSize + 2 * margin;

    canvas.width = width;
    canvas.height = height;

    const xLeft = margin;
    const xRight = margin + fullParts * deltaX;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, width, height);

    // Pin labels
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    for (let pin = 1; pin <= fullBights; pin++) {
      const y = pinToY(pin, fullBights, margin, cellSize, false);
      ctx.textAlign = 'right';
      ctx.fillText(pin.toString(), margin - 6, y + 4);
      ctx.textAlign = 'left';
      ctx.fillText(pin.toString(), width - margin + 6, y + 4);
    }

    // Mandrel border
    ctx.strokeStyle = '#e63946';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(xLeft, margin, xRight - xLeft, height - 2 * margin);
    ctx.setLineDash([]);

    // 1. Build full-line paths (for crossing detection)
    const allFullLines: FullLine[] = [];
    knot.strands.forEach((strand, si) => {
      strand.halfCycles.forEach((hc, hci) => {
        const fromFullPin = toFullPin(hc.fromPin, si, numStrands);
        const toFullPin_ = toFullPin(hc.toPin, si, numStrands);
        const fromY = pinToY(fromFullPin, fullBights, margin, cellSize, false);
        const toY = pinToY(toFullPin_, fullBights, margin, cellSize, false);
        const fromRight = hci % 2 === 0;
        const from: Point = fromRight ? { x: xLeft, y: fromY } : { x: xRight, y: fromY };
        const to: Point = fromRight ? { x: xRight, y: toY } : { x: xLeft, y: toY };
        const isBackslash = to.y > from.y;
        allFullLines.push({ strandIndex: si, hcIndex: hci, from, to, isBackslash, strand });
      });
    });

    // 2. Build run-level segments (for rendering)
    const allSegments: Segment[] = [];
    knot.strands.forEach((strand, si) => {
      strand.halfCycles.forEach((hc, hci) => {
        const runs = hc.runs as string[];
        const n = runs.length;
        if (n === 0) return;

        const fromFullPin = toFullPin(hc.fromPin, si, numStrands);
        const toFullPin_ = toFullPin(hc.toPin, si, numStrands);
        const startY = pinToY(fromFullPin, fullBights, margin, cellSize, false);
        const endY = pinToY(toFullPin_, fullBights, margin, cellSize, false);
        const fromRight = hci % 2 === 0;

        const columns: number[] = [];
        for (let i = 0; i < n; i++) columns.push(si + i * numStrands);
        if (!fromRight) columns.reverse();

        const tValues: number[] = [];
        for (let i = 0; i < n; i++) {
          const col = columns[i];
          const crossX = margin + (col + 1) * deltaX;
          const t = fromRight
            ? (crossX - xLeft) / (xRight - xLeft)
            : (xRight - crossX) / (xRight - xLeft);
          tValues.push(t);
        }

        const points: Point[] = [];
        points.push(fromRight ? { x: xLeft, y: startY } : { x: xRight, y: startY });
        for (let i = 0; i < n; i++) {
          const t = tValues[i];
          const px = fromRight ? xLeft + t * (xRight - xLeft) : xRight - t * (xRight - xLeft);
          const py = startY + t * (endY - startY);
          points.push({ x: px, y: py });
        }
        points.push(fromRight ? { x: xRight, y: endY } : { x: xLeft, y: endY });

        for (let i = 0; i < points.length - 1; i++) {
          const runType = (i < n ? runs[i] : runs[n - 1]) as 'O' | 'U';
          const segFrom = points[i];
          const segTo = points[i + 1];
          const isBackslash = segTo.y > segFrom.y;
          allSegments.push({
            strandIndex: si,
            hcIndex: hci,
            runIndex: i < n ? i : -1,
            runType,
            from: segFrom,
            to: segTo,
            isBackslash,
            strand,
          });
        }
      });
    });

    // 3. Compute crossings
    const rightLines = allFullLines.filter(l => l.hcIndex % 2 === 0);
    const leftLines = allFullLines.filter(l => l.hcIndex % 2 === 1);
    const crossings: CrossingPoint[] = [];
    for (const rl of rightLines) {
      for (const ll of leftLines) {
        const pt = lineIntersection(rl.from, rl.to, ll.from, ll.to);
        if (!pt) continue;
        if (pt.x <= xLeft + 0.5 || pt.x >= xRight - 0.5) continue;
        const { coding, sobre } = rl.strand;
        const col = Math.floor((pt.x - xLeft) / deltaX);
        if (col < 0 || col >= coding.length) continue;
        const row = rl.hcIndex / 2;
        const fromRight = row % 2 === 0;
        const isBackslash = coding[col] === '\\';
        const isOver = fromRight ? isBackslash !== sobre : isBackslash === sobre;
        crossings.push({ x: pt.x, y: pt.y, isOver });
      }
    }

    // 4. Two-pass render
    const bsCanvas = document.createElement('canvas');
    bsCanvas.width = width;
    bsCanvas.height = height;
    const bsCtx = bsCanvas.getContext('2d')!;

    const slCanvas = document.createElement('canvas');
    slCanvas.width = width;
    slCanvas.height = height;
    const slCtx = slCanvas.getContext('2d')!;

    for (const lyr of [
      { oc: bsCtx, bs: true },
      { oc: slCtx, bs: false },
    ]) {
      lyr.oc.lineWidth = strandWidth;
      lyr.oc.lineCap = 'butt';
      for (const seg of allSegments) {
        if (seg.isBackslash !== lyr.bs) continue;
        lyr.oc.strokeStyle = knot.strandColors[seg.strandIndex];
        const start = along(seg.from, seg.to, r);
        const end = along(seg.to, seg.from, r);
        lyr.oc.beginPath();
        lyr.oc.moveTo(start.x, start.y);
        lyr.oc.lineTo(end.x, end.y);
        lyr.oc.stroke();
      }
    }

    // 5. Bight arcs
    knot.strands.forEach((strand, si) => {
      const color = knot.strandColors[si];
      const hcs = strand.halfCycles;
      for (let i = 0; i < hcs.length - 1; i++) {
        const fromFullPin_ = toFullPin(hcs[i].toPin, si, numStrands);
        const py = pinToY(fromFullPin_, fullBights, margin, cellSize, false);
        const endsOnLeft = i % 2 === 0;
        const cx = endsOnLeft ? xLeft : xRight;
        const segs = allSegments.filter(s => s.strandIndex === si && s.hcIndex === i);
        const nextSegs = allSegments.filter(s => s.strandIndex === si && s.hcIndex === i + 1);
        if (segs.length === 0 || nextSegs.length === 0) continue;
        const lastSeg = segs[segs.length - 1];
        const firstSeg = nextSegs[0];
        const clipLast = along(lastSeg.to, lastSeg.from, r);
        const clipFirst = along(firstSeg.from, firstSeg.to, r);
        const startAngle = Math.atan2(clipLast.y - py, clipLast.x - cx);
        const endAngle = Math.atan2(clipFirst.y - py, clipFirst.x - cx);
        for (const oc of [bsCtx, slCtx]) {
          oc.save();
          oc.strokeStyle = color;
          oc.lineWidth = strandWidth;
          oc.lineCap = 'round';
          oc.beginPath();
          oc.arc(cx, py, r, startAngle, endAngle, endsOnLeft);
          oc.stroke();
          oc.restore();
        }
      }
    });

    // 6. Punch gaps
    for (const [oc, isBl] of [
      [bsCtx, true],
      [slCtx, false],
    ] as [CanvasRenderingContext2D, boolean][]) {
      oc.save();
      oc.globalCompositeOperation = 'destination-out';
      for (const cp of crossings) {
        const isUnder = isBl ? !cp.isOver : cp.isOver;
        if (!isUnder) continue;
        oc.save();
        oc.translate(cp.x, cp.y);
        oc.rotate(isBl ? Math.PI / 4 : -Math.PI / 4);
        oc.fillRect(-strandWidth / 2 - 1, -gapWidth, strandWidth + 2, gapWidth * 2);
        oc.restore();
      }
      oc.restore();
    }

    // 7. Composite
    ctx.drawImage(bsCanvas, 0, 0);
    ctx.drawImage(slCanvas, 0, 0);

    // 8. Mask margins
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(0, 0, width, margin);
    ctx.fillRect(0, height - margin, width, margin);
    ctx.restore();
  }, [knot, strandWidth, gapWidth]);

  return (
    <Container>
      <Canvas ref={canvasRef} />
    </Container>
  );
};
