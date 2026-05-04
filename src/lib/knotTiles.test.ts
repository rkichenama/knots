import { describe, it, expect } from 'vitest';
import { Knot } from './knot';
import { knotToGrid, CellType } from './knotTiles';

describe('knotToGrid', () => {
  it('grid dimensions are bights rows × (parts+1) cols', () => {
    const knot = new Knot({ parts: 5, bights: 6 });
    const grid = knotToGrid(knot);
    expect(grid.length).toBe(6);
    expect(grid[0].length).toBe(6); // parts+1 = 6
  });

  it('all rows have CURVE_LEFT at col 0 and CURVE_RIGHT at col parts', () => {
    const knot = new Knot({ parts: 5, bights: 6 });
    const grid = knotToGrid(knot);
    for (let r = 0; r < 6; r++) {
      expect(grid[r][0]).toBe('CURVE_LEFT');
      expect(grid[r][5]).toBe('CURVE_RIGHT');
    }
  });

  it('interior cells are CROSS_OVER_L or CROSS_OVER_R (never EMPTY for standard knot)', () => {
    const knot = new Knot({ parts: 5, bights: 6 });
    const grid = knotToGrid(knot);
    for (let r = 0; r < 6; r++) {
      for (let c = 1; c < 5; c++) {
        expect(['CROSS_OVER_L', 'CROSS_OVER_R'] as CellType[]).toContain(grid[r][c]);
      }
    }
  });

  it('sobre=true inverts all interior crossing types', () => {
    const knot = new Knot({ parts: 5, bights: 4, sobre: false });
    const knotSobre = new Knot({ parts: 5, bights: 4, sobre: true });
    const grid = knotToGrid(knot);
    const gridSobre = knotToGrid(knotSobre);
    for (let r = 0; r < 4; r++) {
      for (let c = 1; c < 5; c++) {
        const inverted: CellType = grid[r][c] === 'CROSS_OVER_L' ? 'CROSS_OVER_R' : 'CROSS_OVER_L';
        expect(gridSobre[r][c]).toBe(inverted);
      }
    }
  });

  it('even rows (rightward) and odd rows (leftward) have inverted crossings at same column', () => {
    const knot = new Knot({ parts: 5, bights: 4 });
    const grid = knotToGrid(knot);
    for (let c = 1; c < 5; c++) {
      const evenCell = grid[0][c]; // row 0 = rightward
      const oddCell  = grid[1][c]; // row 1 = leftward
      expect(evenCell).not.toBe(oddCell);
    }
  });

  it('works with even parts (parts=6, bights=4)', () => {
    const knot = new Knot({ parts: 6, bights: 4 });
    const grid = knotToGrid(knot);
    expect(grid.length).toBe(4);
    expect(grid[0].length).toBe(7); // parts+1 = 7
    expect(grid[0][0]).toBe('CURVE_LEFT');
    expect(grid[0][6]).toBe('CURVE_RIGHT');
  });
});
