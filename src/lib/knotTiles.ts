import { Knot } from './knot';

export type CellType =
  | 'CURVE_LEFT'
  | 'CURVE_RIGHT'
  | 'CROSS_OVER_L'
  | 'CROSS_OVER_R'
  | 'STRAND_LR'
  | 'STRAND_RL'
  | 'EMPTY';

export function knotToGrid(knot: Knot): CellType[][] {
  const { parts, bights, coding, sobre } = knot;

  const grid: CellType[][] = Array.from(
    { length: bights },
    () => Array<CellType>(parts + 1).fill('EMPTY')
  );

  for (let r = 0; r < bights; r++) {
    grid[r][0]     = 'CURVE_LEFT';
    grid[r][parts] = 'CURVE_RIGHT';

    const isRightward = r % 2 === 0;

    for (let c = 1; c < parts; c++) {
      const isBackslash = (coding[c - 1] === '\\') !== sobre;
      if (isRightward) {
        grid[r][c] = isBackslash ? 'CROSS_OVER_R' : 'CROSS_OVER_L';
      } else {
        grid[r][c] = isBackslash ? 'CROSS_OVER_L' : 'CROSS_OVER_R';
      }
    }
  }

  return grid;
}
