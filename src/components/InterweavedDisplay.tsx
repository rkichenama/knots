import * as React from 'react';
import { InterweavedKnot } from '../lib';
import { AlgorithmDiagram } from './AlgorithmDiagram';
import { CombinedRunList } from './CombinedRunList';
import { InterweavedDiagram } from './InterweavedDiagram';
import { KnotGrid } from './KnotGrid';
import { RunList } from './RunList';
import { UnrolledMandrelDiagram } from './UnrolledMandrelDiagram';

type Props = { interweaved: InterweavedKnot };

export const InterweavedDisplay: React.FC<Props> = ({ interweaved }) => {
  const [activeTab, setActiveTab] = React.useState(0);

  const tabs = ['Overall', ...interweaved.strands.map((_, i) => `Strand ${i + 1}`)];

  return (
    <div>
      <h3 className="text-center mb-2">
        {interweaved.parts}P × {interweaved.bights}B — {interweaved.numStrands} interwoven strands
      </h3>

      <div className="flex gap-1 border-b mb-4">
        {tabs.map((label, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`px-3 py-1 text-sm border-b-2 ${
              activeTab === i
                ? 'border-blue-600 font-semibold'
                : 'border-transparent hover:border-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 0 && (
        <div className="flex flex-col gap-4">
          <UnrolledMandrelDiagram knot={interweaved} />
          {/* <InterweavedDiagram strands={interweaved.strands} colors={interweaved.strandColors} /> */}
          <CombinedRunList interweaved={interweaved} />
        </div>
      )}

      {interweaved.strands.map((strand, i) =>
        activeTab === i + 1 ? (
          <div key={i} className="flex flex-col gap-4">
            <h4 className="text-center" style={{ color: interweaved.strandColors[i] }}>
              Strand {i + 1} — {strand.parts}P × {strand.bights}B {strand.sobre ? 'sobre' : 'casa'}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <AlgorithmDiagram knot={strand} />
              <KnotGrid knot={strand} color={interweaved.strandColors[i]} />
              <div className="col-span-2">
                <RunList knot={strand} />
              </div>
            </div>
          </div>
        ) : null
      )}
    </div>
  );
};
