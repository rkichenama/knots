import { describe, it, expect } from 'vitest';
import { getPinY, traceStrandPath } from './tying-logic';

describe('tying-logic', () => {
  it('calculates pin Y correctly for even leads', () => {
    // bights=6, cellSize=10, margin=20
    // pin 1 in center section (section=1)
    // height = 6 * 10 = 60
    // y = margin + (2 - section) * height + (B - pin) * cellSize + cellSize/2
    // y = 20 + (2 - 1) * 60 + (6 - 1) * 10 + 5 = 20 + 60 + 50 + 5 = 135
    expect(getPinY(1, 1, 6, 10, 20, false)).toBe(135);
  });

  it('calculates pin Y correctly for odd leads (shifted upward)', () => {
    // pin 1 on right side (isRight=true) with odd parts
    // y = even_y - (cellSize / 2) = 135 - 5 = 130
    expect(getPinY(1, 1, 6, 10, 20, true)).toBe(130);
  });

  it('traces a basic path correctly', () => {
    const strandMock = {
      pins: [1, 4, 2], // Simple mock pins
      halfCycles: [
          { fromPin: 1, toPin: 4 },
          { fromPin: 4, toPin: 2 }
      ]
    };
    // Mock parameters: parts=4 (even), bights=6, cellSize=10, margin=20
    const path = traceStrandPath(strandMock as any, 4, 6, 10, 20);
    expect(path.length).toBe(3); // 3 points for 2 half-cycles
    expect(path[0].y).toBe(135); // Start at Center Pin 1
  });
});
