import { Knot } from './knot';
import gcd from './gcd';
import { InterweavedKnotProps } from './types';

const DEFAULT_COLORS = ['#e63946', '#457b9d', '#2a9d8f', '#e9c46a', '#f4a261'];

export class InterweavedKnot {
  parts: number;
  bights: number;
  numStrands: number;
  strands: Knot[];
  strandColors: string[];

  constructor({ parts, bights, strands }: InterweavedKnotProps) {
    if (!parts || !bights) {
      throw 'parts and bights must both be greater than 0';
    }
    this.parts = parts;
    this.bights = bights;
    this.numStrands = gcd(parts, bights);

    const strandParts = parts / this.numStrands;
    const strandBights = bights / this.numStrands;

    this.strands = Array.from({ length: this.numStrands }, (_, i) => {
      const cfg = strands[i] ?? {};
      return new Knot({
        parts: strandParts,
        bights: strandBights,
        sobre: cfg.sobre,
        pattern: cfg.pattern,
      });
    });

    this.strandColors = Array.from({ length: this.numStrands }, (_, i) =>
      strands[i]?.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]
    );
  }


  combinedHalfCyclesWithStrand(): { step: string; strandIndex: number }[] {
    const list = [] as { step: string; strandIndex: number }[];
    const allSteps = this.strands
      .map((s, strandIndex) => (
        s.steps().map(step => ({ step, strandIndex }))
      ));
    for (let j = 0; j < Math.max(...allSteps.map(s => s.length)); j++) {
      for (let i = 0; i < this.numStrands; i++) {
        if (allSteps[i][j]) {
          list.push(allSteps[i][j]);
        }
      }
    }
    return list;
  }
}
