import * as React from 'react';
import { KnotControls } from './components/KnotControls';
import { KnotDisplay } from './components/KnotDisplay';
import { InterweavedDisplay } from './components/InterweavedDisplay';
import { CurrentInterweaved, KnotError, StrandCount } from './data/CurrentKnot';

export const App = () => {
  const isMultiStrand = StrandCount.value > 1 && CurrentInterweaved.value !== null;

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto p-4">
      <KnotControls />
      {KnotError.value && <p className="text-red-600 text-sm">{KnotError.value}</p>}
      <hr />
      {isMultiStrand
        ? <InterweavedDisplay interweaved={CurrentInterweaved.value!} />
        : <KnotDisplay />
      }
    </div>
  );
};
