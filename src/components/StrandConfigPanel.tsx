import * as React from 'react';
import { StrandProps } from '../lib';
import styled from 'styled-components';

const DEFAULT_COLORS = ['#e63946', '#457b9d', '#2a9d8f', '#e9c46a', '#f4a261'];

const Switch = styled.label`
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
`;

const Input = styled.input`
  opacity: 0;
  width: 0;
  height: 0;

  // When checked, change the background of the slider sibling
  &:checked + span {
    background-color: #2196f3;
  }

  // When checked, move the circle inside the slider
  &:checked + span:before {
    transform: translateX(26px);
  }
`;

const Slider = styled.span`
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.4s;
  border-radius: 34px;

  &:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 4px;
    bottom: 3px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
  }
`;

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
            <span className="lex items-center gap-1 text-sm">
              Sobre&nbsp;
              <Switch>
                <Input type="checkbox" checked={!!s.sobre} onChange={e => update(i, { sobre: e.target.checked })} />
                <Slider />
              </Switch>
            </span>
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
