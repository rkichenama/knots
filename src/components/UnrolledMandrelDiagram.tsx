import * as React from 'react';
import styled from 'styled-components';
import { InterweavedKnot } from '../lib/interweaved-knot';
import { computeMandrelPieces, MandrelPiece, MandrelMetricsFSA } from '../lib/unrolled-mandrel';

type Props = {
  knot: InterweavedKnot;
  strandWidth?: number;
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

// ── Drawing helpers ───────────────────────────────────────────────────────────

/**
 * Draw a crossing piece (right or left) at (x, y).
 *
 * For a 'right' piece (going right), rotate by: PI/2 + angle
 * For a 'left'  piece (going left),  rotate by: PI/2 - angle
 *
 * The strand is rendered as a filled rect centered at origin, width=partDist,
 * height=strandWidth, with two edge-lines along the strand direction.
 *
 * Over pieces (uo='O') fill BEFORE drawing edge lines (appears on top).
 * Under pieces (uo='U') fill AFTER drawing edge lines (appears below).
 */
function drawCrossing(
  ctx: CanvasRenderingContext2D,
  piece: MandrelPiece,
  metrics: MandrelMetricsFSA,
  color: string
): void {
  const { x, y, type, uo } = piece;
  const { partDist, angle, strandWidth } = metrics;
  const sw = strandWidth;
  const pd = partDist;

  ctx.save();
  ctx.translate(x, y);

  if (type === 'right') {
    ctx.rotate(Math.PI / 2 + angle);
  } else {
    // left
    ctx.rotate(Math.PI / 2 - angle);
  }

  const fillStrand = () => {
    ctx.fillStyle = color;
    ctx.fillRect(-pd / 2 - 0.5, -sw / 2, pd + 1, sw);
  };

  const drawEdgeLines = () => {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    // Top edge line
    ctx.beginPath();
    ctx.moveTo(-pd / 2, -sw / 2);
    ctx.lineTo(pd / 2, -sw / 2);
    ctx.stroke();
    // Bottom edge line
    ctx.beginPath();
    ctx.moveTo(-pd / 2, sw / 2);
    ctx.lineTo(pd / 2, sw / 2);
    ctx.stroke();
  };

  if (uo === 'O') {
    // Over: fill first (solid color underneath edge lines)
    fillStrand();
    drawEdgeLines();
  } else {
    // Under: draw edge lines first, then fill on top — but since 'under' means
    // this strand passes beneath, we use destination-over compositing so the
    // fill goes behind whatever was drawn already.
    ctx.globalCompositeOperation = 'destination-over';
    drawEdgeLines();
    fillStrand();
  }

  ctx.restore();
}

/**
 * Draw a miter (bight wrap) piece at (x, y).
 *
 * FSA draws top_miter geometry, then applies a rotation to orient it:
 *   right_miter: rotate -PI/2 (bight wraps on the right side)
 *   left_miter:  rotate +PI/2 (bight wraps on the left side)
 *
 * top_miter geometry (at origin):
 *   Two quadratic curves connecting the two strand edges around the pin arc.
 */
function drawMiter(
  ctx: CanvasRenderingContext2D,
  piece: MandrelPiece,
  metrics: MandrelMetricsFSA,
  color: string
): void {
  const { x, y, type } = piece;
  const { partDist, angle, strandWidth } = metrics;

  const l = partDist * 0.5;
  const w = strandWidth * 0.5;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  // top_miter control points — exact FSA values (at origin after translate+rotate)
  const x1 =  l * cosA - w * sinA;  const y1 = -l * sinA - w * cosA;
  const x2 =  l * cosA + w * sinA;  const y2 = -l * sinA + w * cosA;
  const x3 = 0;                      const y3 =  w / cosA;  // outer control point
  const x4 = -l * cosA - w * sinA;  const y4 = -l * sinA + w * cosA;
  const x5 = -l * cosA + w * sinA;  const y5 = -l * sinA - w * cosA;
  const x6 = 0;                      const y6 = -w / cosA;  // inner control point

  ctx.save();
  ctx.translate(x, y);

  if (type === 'right_miter') {
    ctx.rotate(-Math.PI / 2);
  } else {
    // left_miter
    ctx.rotate(Math.PI / 2);
  }

  // Fill the miter shape
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.quadraticCurveTo(x3, y3, x4, y4); // outer curve
  ctx.lineTo(x5, y5);
  ctx.quadraticCurveTo(x6, y6, x1, y1); // inner curve
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  // Stroke outer edge
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.quadraticCurveTo(x3, y3, x4, y4);
  ctx.stroke();

  // Stroke inner edge
  ctx.beginPath();
  ctx.moveTo(x5, y5);
  ctx.quadraticCurveTo(x6, y6, x1, y1);
  ctx.stroke();

  ctx.restore();
}

// ── Component ─────────────────────────────────────────────────────────────────

export const UnrolledMandrelDiagram: React.FC<Props> = ({
  knot,
  strandWidth = 20,
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { metrics, pieces } = computeMandrelPieces(knot, strandWidth);
    const { canvasWidth, canvasHeight } = metrics;

    canvas.width = Math.ceil(canvasWidth);
    canvas.height = Math.ceil(canvasHeight);

    // White background
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Determine max HC count across strands
    const maxHCs = Math.max(...knot.strands.map(s => s.halfCycles.length));

    // Draw interleaved by HC index so over/under compositing works across strands.
    // Within each HC: draw crossing pieces in sequence (j order), miter last.
    // Under pieces use destination-over compositing set inside drawCrossing.
    for (let hcIdx = 0; hcIdx < maxHCs; hcIdx++) {
      for (let si = 0; si < knot.numStrands; si++) {
        const strandPieces = pieces[si].filter(p => p.hcIndex === hcIdx);
        const color = knot.strandColors[si];

        // Separate crossing pieces (in original order) from miter
        const crossings = strandPieces.filter(
          p => p.type === 'right' || p.type === 'left'
        );
        const miters = strandPieces.filter(
          p => p.type === 'right_miter' || p.type === 'left_miter'
        );

        // Draw crossings in sequence — drawCrossing sets globalCompositeOperation internally
        ctx.globalCompositeOperation = 'source-over';
        for (const p of crossings) {
          drawCrossing(ctx, p, metrics, color);
        }

        // Reset before miter (miters are always source-over)
        ctx.globalCompositeOperation = 'source-over';
        for (const p of miters) {
          drawMiter(ctx, p, metrics, color);
        }
      }
    }

  }, [knot, strandWidth]);

  return (
    <div>
      <h4>Unrolled Mandrel</h4>
      <Container>
        <Canvas ref={canvasRef} />
      </Container>
    </div>
  );
};
