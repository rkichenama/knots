import * as React from 'react';
import styled from 'styled-components';
import { InterweavedKnot } from '../lib/interweaved-knot';
import { getPinY, traceStrandPath, Point, lineIntersection, along } from '../lib/tying-logic';

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
  overflow: auto;
`;

const Canvas = styled.canvas`
  display: block;
`;

type FullLine = {
  strandIndex: number;
  from: Point;
  to: Point;
  isBackslash: boolean;
};

export const TyingKnotDiagram: React.FC<Props> = ({ knot, strandWidth, gapWidth }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = strandWidth + gapWidth;
    const margin = cellSize * 2;
    const mandrelWidth = (knot.parts - 1) * cellSize;
    const width = mandrelWidth + 2 * margin;
    const sectionHeight = knot.bights * cellSize;
    const height = 3 * sectionHeight + 2 * margin;

    canvas.width = width;
    canvas.height = height;
    
    // 1. Generate all paths for all strands
    const allPaths = knot.strands.map(strand => 
        traceStrandPath(strand, knot.parts, knot.bights, cellSize, margin)
    );

    // 2. Generate all lines across all 3 tiled sections
    const allLines: FullLine[] = [];
    const offsets = [-sectionHeight, 0, sectionHeight];

    allPaths.forEach((path, si) => {
        offsets.forEach(offset => {
            for (let i = 0; i < path.length - 1; i++) {
                const p1 = path[i];
                const p2 = path[i+1];
                const from: Point = { x: p1.x, y: p1.y + offset };
                const to: Point = { x: p2.x, y: p2.y + offset };
                
                // Only keep lines that are at least partially within the 3x mandrel area
                if (Math.max(from.y, to.y) < margin || Math.min(from.y, to.y) > height - margin) continue;

                allLines.push({
                    strandIndex: si,
                    from,
                    to,
                    isBackslash: to.y > from.y
                });
            }
        });
    });

    // 3. Find crossings
    const crossings: { x: number; y: number; isOver: boolean; backslashLine: FullLine; slashLine: FullLine }[] = [];
    const backslashLines = allLines.filter(l => l.isBackslash);
    const slashLines = allLines.filter(l => !l.isBackslash);

    backslashLines.forEach(bl => {
        slashLines.forEach(sl => {
            const pt = lineIntersection(bl.from, bl.to, sl.from, sl.to);
            if (pt) {
                // Crossing point within the mandrel width
                if (pt.x <= margin + 1 || pt.x >= margin + mandrelWidth - 1) return;

                // Lookup coding from first strand (assumes same coding for all strands in interweave)
                const strand = knot.strands[0];
                const col = Math.floor((pt.x - margin) / cellSize);
                if (col < 0 || col >= strand.coding.length) return;

                const isBackslashOver = strand.coding[col] === '\\';
                // In our projection, backslash is always NW-SE.
                // The knot's coding logic: \ means backslash goes over in a right-going row.
                // In our infinite mandrel, we need to check if the 'row' is even or odd.
                // But wait, in a tying guide, the coding is usually static per column.
                const isOver = isBackslashOver !== strand.sobre;

                crossings.push({ x: pt.x, y: pt.y, isOver, backslashLine: bl, slashLine: sl });
            }
        });
    });

    // 4. Render
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, width, height);

    // Sections background
    ctx.fillStyle = '#fff';
    ctx.fillRect(margin, margin + sectionHeight, mandrelWidth, sectionHeight);

    // Tiling Backgrounds
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(margin, margin, mandrelWidth, sectionHeight);
    ctx.fillRect(margin, margin + 2 * sectionHeight, mandrelWidth, sectionHeight);

    // Draw lines in two passes
    const drawLines = (backslash: boolean) => {
        allLines.forEach(line => {
            if (line.isBackslash !== backslash) return;
            ctx.beginPath();
            ctx.strokeStyle = knot.strandColors[line.strandIndex];
            ctx.lineWidth = strandWidth;
            ctx.lineCap = 'butt';
            
            // Clip ends for bights
            const start = along(line.from, line.to, cellSize / 2);
            const end = along(line.to, line.from, cellSize / 2);
            
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
        });
    };

    // Draw Over/Under
    const bsCanvas = document.createElement('canvas');
    bsCanvas.width = width;
    bsCanvas.height = height;
    const bsCtx = bsCanvas.getContext('2d')!;

    const slCanvas = document.createElement('canvas');
    slCanvas.width = width;
    slCanvas.height = height;
    const slCtx = slCanvas.getContext('2d')!;

    // Draw Backslashes to bsCanvas
    bsCtx.lineWidth = strandWidth;
    backslashLines.forEach(line => {
        bsCtx.strokeStyle = knot.strandColors[line.strandIndex];
        const start = along(line.from, line.to, cellSize / 2);
        const end = along(line.to, line.from, cellSize / 2);
        bsCtx.beginPath();
        bsCtx.moveTo(start.x, start.y);
        bsCtx.lineTo(end.x, end.y);
        bsCtx.stroke();
    });

    // Draw Slashes to slCanvas
    slCtx.lineWidth = strandWidth;
    slashLines.forEach(line => {
        slCtx.strokeStyle = knot.strandColors[line.strandIndex];
        const start = along(line.from, line.to, cellSize / 2);
        const end = along(line.to, line.from, cellSize / 2);
        slCtx.beginPath();
        slCtx.moveTo(start.x, start.y);
        slCtx.lineTo(end.x, end.y);
        slCtx.stroke();
    });

    // Punch gaps
    crossings.forEach(cp => {
        const targetCtx = cp.isOver ? slCtx : bsCtx;
        targetCtx.save();
        targetCtx.globalCompositeOperation = 'destination-out';
        targetCtx.translate(cp.x, cp.y);
        targetCtx.rotate(cp.backslashLine.isBackslash ? Math.PI / 4 : -Math.PI / 4);
        targetCtx.fillRect(-strandWidth / 2 - 1, -gapWidth, strandWidth + 2, gapWidth * 2);
        targetCtx.restore();
    });

    // Composite
    ctx.drawImage(bsCanvas, 0, 0);
    ctx.drawImage(slCanvas, 0, 0);

    // 5. Bight Arcs
    allPaths.forEach((path, si) => {
        offsets.forEach(offset => {
            ctx.strokeStyle = knot.strandColors[si];
            ctx.lineWidth = strandWidth;
            ctx.lineCap = 'round';
            for (let i = 0; i < path.length - 1; i++) {
                const p1 = { x: path[i].x, y: path[i].y + offset };
                const p2 = { x: path[i+1].x, y: path[i+1].y + offset };
                
                // Draw arc at start of half-cycle (pin)
                const isLeft = p1.x === margin;
                const r = cellSize / 2;
                
                // We need the PREVIOUS line to draw the arc correctly
                // Simplified: just draw circles at pins for now, or arcs if possible
                ctx.beginPath();
                ctx.arc(p1.x, p1.y, r, 0, Math.PI * 2);
                ctx.stroke();
            }
        });
    });

    // 6. UI Overlay
    ctx.strokeStyle = '#e63946';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(margin, margin + sectionHeight, mandrelWidth, sectionHeight);
    ctx.setLineDash([]);

    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    for (let section = 0; section < 3; section++) {
        for (let b = 1; b <= knot.bights; b++) {
            const y = margin + (2 - section) * sectionHeight + (knot.bights - b) * cellSize + cellSize / 2;
            ctx.fillText(b.toString(), margin - 8, y + 4);
            ctx.textAlign = 'left';
            ctx.fillText(b.toString(), width - margin + 8, y + 4);
            ctx.textAlign = 'right';
        }
    }

  }, [knot, strandWidth, gapWidth]);

  return (
    <Container>
      <Canvas ref={canvasRef} />
    </Container>
  );
};
