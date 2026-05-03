import * as React from 'react';
import styled from 'styled-components';
import { Knot, KnotProps } from '../lib';
import { CurrentKnot, KnotError } from '../data/CurrentKnot';

let defaultKnot = {
  bights: 6,
  parts: 5,
  sobre: false,
  pattern: '\\/',
};

(() => {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const candidates = Object.fromEntries(params.entries());
  for (const key in defaultKnot) {
    if (candidates[key]) {
      defaultKnot[key] = /(bights|parts)/.test(key)
        ? Number(candidates[key])
        : /sobre/.test(key)
          ? candidates[key] === 'true'
          : candidates[key];
    }
  }
})();

export const KnotControls: React.FC<any> = () => {
  const [{
    bights,
    parts,
    sobre,
    pattern,
  }, setProps] = React.useState<KnotProps>(defaultKnot);

  const change = React.useCallback((key: keyof Knot, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = /pattern/.test(key)
      ? e.target.value
      : /sobre/.test(key)
        ? e.target.checked
        : e.target.valueAsNumber;
    setProps((prev) => ({ ...prev, [key]: value }));
  }, [setProps]);

  React.useEffect(() => {
    try {
      // setMsg('');
      KnotError.value = '';
      CurrentKnot.value = new Knot({ bights, parts, sobre, pattern });
      const params = new URLSearchParams();
      params.set('bights', String(bights));
      params.set('parts', String(parts));
      params.set('sobre', String(sobre));
      params.set('pattern', pattern ?? '');
      location.hash = params.toString();
    } catch (err: any) {
      // setMsg(err.toString());
      KnotError.value = err.toString();
    }
  }, [bights, parts, sobre, pattern]);

  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="flex justify-between items-center">
        Bights
        <input className="text-center border" type='number' value={bights} min={2} onChange={(e) => change('bights', e)}/>
      </label>
      <label className="flex justify-between items-center">
        Parts
        <input className="text-center border" type='number' value={parts} min={2} onChange={(e) => change('parts', e)}/>
      </label>
      <label className="flex justify-between items-center">
        Pattern
        <input className="text-center border" type='text' value={pattern} onChange={(e) => change('pattern', e)}/>
      </label>
      <label className="flex justify-center items-center">
        Sobre
        <input type='checkbox' checked={sobre} onChange={(e) => change('sobre', e)}/>
      </label>
    </div>
  );
};