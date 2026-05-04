import * as React from 'react';
import { InterweavedKnot } from '../lib';

type Props = {
  interweaved: InterweavedKnot;
};

const highlight = (text: string) =>
  text.replace(/(\d+)/g, '<strong class="text-(--highlight)">$1</strong>');

export const CombinedRunList: React.FC<Props> = ({ interweaved }) => {
  const combined = interweaved.combinedHalfCyclesWithStrand();

  return (
    <div className="flex flex-col gap-4">
      <section>
        <h4 className="font-semibold">Tying Order</h4>
        <ol className="list-decimal">
          {combined.map(({ step: text, strandIndex }, i) => {
            const prevStrand = i > 0 ? combined[i - 1].strandIndex : strandIndex;
            const switchStrand = i > 0 && strandIndex !== prevStrand;
            const color = interweaved.strandColors[strandIndex];
            // const text = `pin ${hc.fromPin} → pin ${hc.toPin}: ${hc.steps() ?? 'free run'}`;
            return (
              <React.Fragment key={i}>
                {switchStrand && (
                  <div
                    className="list-none px-1 py-0.5 text-xs font-semibold italic border-t"
                    style={{ color, borderColor: color }}
                  >
                    ↳ switch to strand {strandIndex + 1}
                  </div>
                )}
                <li
                  className="even:bg-gray-100 odd:bg-gray-200 border-l-2 pl-2"
                  style={{ borderColor: color }}
                  dangerouslySetInnerHTML={{ __html: highlight(text) }}
                />
              </React.Fragment>
            );
          })}
        </ol>
      </section>

      <section>
        <h4 className="font-semibold">By Strand</h4>
        {interweaved.strands.map((strand, si) => (
          <div key={si} className="mb-2">
            <h5 className="text-sm font-medium">Strand {si + 1}</h5>
            <ol className="list-decimal">
              {strand.steps().map((row, i) => (
                <li
                  key={i}
                  className="even:bg-gray-100 odd:bg-gray-200 text-sm"
                  dangerouslySetInnerHTML={{ __html: highlight(row) }}
                />
              ))}
            </ol>
          </div>
        ))}
      </section>
    </div>
  );
};
