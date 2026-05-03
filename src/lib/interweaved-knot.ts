import { HalfCycle } from './halfcycle';
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

  combinedHalfCycles(): HalfCycle[] {
    return this.strands
      .flatMap(s => s.halfCycles)
      .sort((a, b) => a.fromPin - b.fromPin);
  }
}
