import * as React from 'react';
import styled from 'styled-components';
import { InterweavedKnot } from '../lib/interweaved-knot';
import { segmentFromHalfCycle, buildCrossingRegistry, Segment } from '../lib/knotPath';

type Props = {
  knot: InterweavedKnot;
  strandWidth: number;
  gapWidth: number;
};

const ResizeContainer = styled.div`
  overflow: hidden;
  resize: auto;
`;

export const TileKnotDiagram: React.FC<Props> = ({ knot, strandWidth, gapWidth }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const unit = strandWidth + gapWidth;
    const width = knot.parts * unit;
    const height = knot.bights * 2 * unit;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, width, height);

    render(ctx, knot, strandWidth, gapWidth, unit, width, height);
  }, [knot, strandWidth, gapWidth]);

  return (
    <ResizeContainer>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </ResizeContainer>
  );
};

function render(
  ctx: CanvasRenderingContext2D,
  knot: InterweavedKnot,
  strandWidth: number,
  gapWidth: number,
  unit: number,
  width: number,
  height: number
) {
  const segments: Segment[] = [];
  knot.strands.forEach((strand, si) => {
    strand.halfCycles.forEach((hc, hi) => {
      segments.push(segmentFromHalfCycle(hc, hi, si, unit, width));
    });
  });

  const registry = buildCrossingRegistry(knot.strands, segments);

  const offscreens = knot.strands.map(() => new OffscreenCanvas(width, height));

  knot.strands.forEach((strand, si) => {
    const oc = offscreens[si];
    const octx = oc.getContext('2d') as OffscreenCanvasRenderingContext2D;
    const color = knot.strandColors[si];

    strand.halfCycles.forEach((hc, hi) => {
      const segIndex = segments.findIndex(s => s.strandIndex === si && s.halfCycleIndex === hi);
      const seg = segments[segIndex];

      if (seg.isEdge) {
        drawCurve(octx, seg, unit, strandWidth, gapWidth, color);
      } else {
        drawDiagonal(octx, seg, strandWidth, color);
      }
    });

    strand.halfCycles.forEach((_hc, hi) => {
      const segIndex = segments.findIndex(s => s.strandIndex === si && s.halfCycleIndex === hi);
      const crossings = registry.get(segIndex) ?? [];
      crossings.forEach(cp => {
        if (!cp.isOver) {
          punchGap(octx, cp.coord, gapWidth);
        }
      });
    });
  });

  knot.strands.forEach((_strand, si) => {
    ctx.drawImage(offscreens[si], 0, 0);
  });
}

function drawDiagonal(ctx: OffscreenCanvasRenderingContext2D, seg: Segment, strandWidth: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = strandWidth;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(seg.from.x, seg.from.y);
  ctx.lineTo(seg.to.x, seg.to.y);
  ctx.stroke();
  ctx.restore();
}

function drawCurve(
  ctx: OffscreenCanvasRenderingContext2D,
  seg: Segment,
  unit: number,
  strandWidth: number,
  gapWidth: number,
  color: string
) {
  const arcRadius = unit;
  const innerRadius = arcRadius - gapWidth / 2;
  const outerRadius = arcRadius + gapWidth / 2;

  const cx = seg.from.x;
  const cy = (seg.from.y + seg.to.y) / 2;

  const isLeft = cx === 0;
  const startAngle = isLeft ? -Math.PI / 2 : Math.PI / 2;
  const endAngle = isLeft ? Math.PI / 2 : -Math.PI / 2;
  const anticlockwise = !isLeft;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = strandWidth / 3;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius, startAngle, endAngle, anticlockwise);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, outerRadius, startAngle, endAngle, anticlockwise);
  ctx.stroke();

  ctx.restore();
}

function punchGap(ctx: OffscreenCanvasRenderingContext2D, coord: { x: number; y: number }, gapWidth: number) {
  const half = gapWidth;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillRect(coord.x - half, coord.y - half, half * 2, half * 2);
  ctx.restore();
}
