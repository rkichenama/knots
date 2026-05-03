import * as React from 'react';
import { InterweavedKnot } from '../lib';

type Props = {
  interweaved: InterweavedKnot;
};

const highlight = (text: string) =>
  text.replace(/(\d+)/g, '<strong style="font-weight:bold">$1</strong>');

export const CombinedRunList: React.FC<Props> = ({ interweaved }) => {
  const combined = interweaved.combinedHalfCycles();

  return (
    <div className="flex flex-col gap-4">
      <section>
        <h4 className="font-semibold">Tying Order</h4>
        <ol className="list-decimal">
          {combined.map((hc, i) => {
            const text = `pin ${hc.fromPin} → pin ${hc.toPin}: ${hc.steps() ?? 'free run'}`;
            return (
              <li
                key={i}
                className="even:bg-gray-100 odd:bg-gray-200"
                dangerouslySetInnerHTML={{ __html: highlight(text) }}
              />
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
