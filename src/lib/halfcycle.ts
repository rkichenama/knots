import { Run } from './types';

export class HalfCycle {
  runs: string[] = [];
  fromPin = 0;
  toPin = 0;
  constructor(fromPin: number = 1, toPin: number = 1) {
    this.runs = [];
    this.fromPin = fromPin;
    this.toPin = toPin;
  }

  append(step: string) { this.runs.push(step); }

  steps() {
    let list: Run[] = [];

    for (let i = 0; i < this.runs.length; i++) {
      if (list.length === 0 || list[list.length - 1].codingPattern != this.runs[i]) {
        list.push({
          codingPattern: this.runs[i],
          count: 1,
        });
      } else {
        list[list.length - 1].count++;
      }
    }

    let strs: string[] = [];
    for (let i = 0; i < list.length; i++) {
      strs.push(`${list[i].codingPattern}${
        list[i].count > 1 ? list[i].count : ''
      }`);
    }

    return list.length ? strs.join(' ') : undefined;
  }
}
