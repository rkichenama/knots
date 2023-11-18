import { KnotProps } from './types';
import { HalfCycle } from './halfcycle';
import gcd from './gcd';

export class Knot {
  parts: number;
  bights: number;
  pattern: string;
  sobre: boolean;

  coding: string;
  wholeNumber: number;
  remainder: number;
  countValue: number;
  cyclicBightNumber: any[];
  topCyclicBightNumber: any[];
  botCyclicBightNumber: any[];
  topCodingPattern: any[];
  botCodingPattern: any[];
  halfCycles: any[];
  pins: any[];

  constructor({ parts = 5, bights = 6, sobre = false, pattern = '\\/' }: KnotProps) {
    this.parts = parts;
    this.bights = bights;
    this.pattern = pattern || '\\/';
    this.sobre = !!sobre;
    this.solve();
  }

  checkConditions() {
    if (!this.parts || !this.bights) {
      throw "the parts and bights both must be greater than 0";
    }
    if (gcd(this.parts, this.bights) != 1) {
      // TODO: handl multiple strands
      throw "the parts and bights must have a greatest common divisor of 1";
    }
  }

  fillCoding() {
    this.coding = '';
    for (let i = 0; i < this.parts - 1; i++) {
      this.coding += this.pattern[i % this.pattern.length];
    }
  }

  initVars() {
    this.wholeNumber = Math.floor(this.parts / this.bights);
    this.remainder = this.parts % this.bights;
    this.countValue = this.bights - this.remainder;
    this.cyclicBightNumber = [];
    this.topCyclicBightNumber = [];
    this.botCyclicBightNumber = [];
    this.topCodingPattern = [];
    this.botCodingPattern = [];
    this.halfCycles = [];
    this.pins = [];
  }

  fillCbn() {
    for (let c = 0; c < this.bights; c++) {
      this.cyclicBightNumber[(c * this.countValue) % this.bights] = c;
    }
    for (let c = 0; c < this.parts - 1; c++) {
      this.topCyclicBightNumber[c] = this.cyclicBightNumber[(c + 1) % this.bights];
      this.botCyclicBightNumber[this.parts - 1 - c - 1] = this.cyclicBightNumber[(c + 1) % this.bights];
    }
  }

  getPartFromType(isOver: boolean) {
    return isOver
      ? this.sobre ? 'U' : 'O'
      : this.sobre ? 'O' : 'U';
  }
  fillUo() {
    for (let i = 0; i < this.parts - 1; i++) {
      const isOver = (this.coding[i] === '\\');
      this.topCodingPattern.push(this.getPartFromType(!isOver));
      this.botCodingPattern.push(this.getPartFromType(isOver));
    }
  }

  fillPins() {
    this.pins.push(1);

    let m = 2 * this.bights;
    if (this.parts % 2) {
      for (let i = 1; i < m; i++) {
        const r = (i * this.parts) % m;
        this.pins.push(Math.floor(r / 2) + 1);
      }
    } else {
      for (let i = 1; i < m; i++) {
        const r = (i * this.parts) % m;
        this.pins.push(Math.floor(
          r === 0
            ? ((i * this.parts + 1) % m) / 2
            : i % 2
              ? r / 2
              : (r + 1) / 2
        ) + 1);
      }
    }

    this.pins.push(1);
  };

  fillHalfCycles() {
    // let goingRight = true;
    let hc = new HalfCycle(this.pins[0], this.pins[1]);
    this.halfCycles.push(hc);

    for (let num = 2; num <= 2 * this.bights; num++) {
      // goingRight = !goingRight;
      hc = new HalfCycle(this.pins[num - 1], this.pins[num]);

      const cyclicBightNumber = (num - 2 - (num % 2)) / 2;

      const [codingPattern, side] = num % 2
        ? [this.topCodingPattern, this.topCyclicBightNumber]
        : [this.botCodingPattern, this.botCyclicBightNumber];
      for (let i = 0; i < codingPattern.length; i++) {
        if (side[i] <= cyclicBightNumber) {
          hc.append(codingPattern[i]);
        }
      }

      this.halfCycles.push(hc);
    }
  }

  solve() {
    this.checkConditions();
    this.fillCoding();
    this.initVars();
    this.fillCbn();
    this.fillUo();
    this.fillPins();
    this.fillHalfCycles();
  }

  steps() {
    let list: string[] = [];
    let atTop = false;
    for (const halfCycle of this.halfCycles) {
      list.push(`${atTop ? 'top' : 'bot'} pin ${halfCycle.fromPin} to ${atTop ? 'bot' : 'top'} pin ${halfCycle.toPin}: ${halfCycle.steps() ?? 'free run'}`);
      atTop = !atTop
    }
    return list;
  }
}
