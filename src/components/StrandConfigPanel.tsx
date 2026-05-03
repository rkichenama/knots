import * as React from 'react';
import { StrandProps } from '../lib';

const DEFAULT_COLORS = ['#e63946', '#457b9d', '#2a9d8f', '#e9c46a', '#f4a261'];

type Props = {
  numStrands: number;
  strands: StrandProps[];
  onChange: (strands: StrandProps[]) => void;
  onApply: () => void;
};

export const StrandConfigPanel: React.FC<Props> = ({ numStrands, strands, onChange, onApply }) => {
  const update = (index: number, patch: Partial<StrandProps>) => {
    const next = strands.map((s, i) => i === index ? { ...s, ...patch } : s);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2 mt-2">
      <h4 className="font-semibold">Configure Strands</h4>
      {Array.from({ length: numStrands }, (_, i) => {
        const s = strands[i] ?? {};
        const color = s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
        return (
          <div key={i} className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={e => update(i, { color: e.target.value })}
              title={`Strand ${i + 1} color`}
            />
            <span className="text-sm">Strand {i + 1}</span>
            <label className="flex items-center gap-1 text-sm">
              Pattern
              <input
                className="border text-center w-16"
                type="text"
                value={s.pattern ?? '\\/'}
                onChange={e => update(i, { pattern: e.target.value })}
              />
            </label>
            <label className="flex items-center gap-1 text-sm">
              Sobre
              <input
                type="checkbox"
                checked={!!s.sobre}
                onChange={e => update(i, { sobre: e.target.checked })}
              />
            </label>
          </div>
        );
      })}
      <button
        className="mt-1 px-3 py-1 bg-blue-600 text-white rounded self-start text-sm"
        onClick={onApply}
      >
        Apply
      </button>
    </div>
  );
};
