import * as React from 'react';
import { InterweavedKnot, Knot, KnotProps, StrandProps } from '../lib';
import gcd from '../lib/gcd';
import { CurrentInterweaved, CurrentKnot, KnotError, StrandCount } from '../data/CurrentKnot';
import { StrandConfigPanel } from './StrandConfigPanel';

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
  }, setProps] = React.useState<Required<KnotProps>>(defaultKnot);

  const [numStrands, setNumStrands] = React.useState(1);
  const [strandConfigs, setStrandConfigs] = React.useState<StrandProps[]>([{}]);
  const [pendingStrands, setPendingStrands] = React.useState<StrandProps[] | null>(null);

  const expectedStrands = parts && bights ? gcd(parts, bights) : 1;

  const change = React.useCallback((key: keyof Knot, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = /pattern/.test(key)
      ? e.target.value
      : /sobre/.test(key)
        ? e.target.checked
        : e.target.valueAsNumber;
    setProps((prev) => ({ ...prev, [key]: value }));
  }, [setProps]);

  React.useEffect(() => {
    if (numStrands <= 1) {
      const required = parts && bights ? gcd(parts, bights) : 1;
      if (required > 1) {
        // auto-promote: build default configs using current pattern/sobre for all strands
        const autoConfigs: StrandProps[] = Array.from({ length: required }, () => ({ pattern, sobre }));
        setNumStrands(required);
        setStrandConfigs(autoConfigs);
        setPendingStrands(null);
        try {
          KnotError.value = '';
          const interweaved = new InterweavedKnot({ parts, bights, strands: autoConfigs });
          CurrentInterweaved.value = interweaved;
          CurrentKnot.value = interweaved.strands[0];
          StrandCount.value = interweaved.numStrands;
        } catch (err: any) {
          KnotError.value = err.toString();
        }
        return;
      }
      try {
        KnotError.value = '';
        CurrentKnot.value = new Knot({ bights, parts, sobre, pattern });
        CurrentInterweaved.value = null;
        StrandCount.value = 1;
        const params = new URLSearchParams();
        params.set('bights', String(bights));
        params.set('parts', String(parts));
        params.set('sobre', String(sobre));
        params.set('pattern', pattern ?? '');
        location.hash = params.toString();
      } catch (err: any) {
        KnotError.value = err.toString();
      }
    }
  }, [bights, parts, sobre, pattern, numStrands]);

  const applyStrands = React.useCallback(() => {
    const configs = pendingStrands ?? strandConfigs;
    try {
      KnotError.value = '';
      const interweaved = new InterweavedKnot({ parts, bights, strands: configs });
      CurrentInterweaved.value = interweaved;
      CurrentKnot.value = interweaved.strands[0];
      StrandCount.value = interweaved.numStrands;
      setStrandConfigs(configs);
      setPendingStrands(null);
    } catch (err: any) {
      KnotError.value = err.toString();
    }
  }, [parts, bights, pendingStrands, strandConfigs]);

  const handleStrandsInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = Math.max(1, e.target.valueAsNumber || 1);
    setNumStrands(n);
    if (n !== expectedStrands && n > 1) {
      KnotError.value = `Warning: ${parts}P × ${bights}B naturally decomposes into ${expectedStrands} strand(s). You entered ${n}.`;
    } else {
      KnotError.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-2">
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
          Strands
          <input
            className="text-center border"
            type='number'
            value={numStrands}
            min={1}
            onChange={handleStrandsInput}
          />
        </label>
        {numStrands <= 1 && (
          <>
            <label className="flex justify-between items-center">
              Pattern
              <input className="text-center border" type='text' value={pattern} onChange={(e) => change('pattern', e)}/>
            </label>
            <label className="flex justify-center items-center col-span-2">
              Sobre
              <input type='checkbox' checked={sobre} onChange={(e) => change('sobre', e)}/>
            </label>
          </>
        )}
      </div>
      {numStrands > 1 && (
        <StrandConfigPanel
          numStrands={numStrands}
          strands={pendingStrands ?? strandConfigs}
          onChange={setPendingStrands}
          onApply={applyStrands}
        />
      )}
    </div>
  );
};
