import * as React from 'react';
import { CurrentKnot, CurrentInterweaved } from '../data/CurrentKnot';
import { InterweavedKnot } from '../lib/interweaved-knot';
import { AlgorithmDiagram } from './AlgorithmDiagram';
import { RunList } from './RunList';
import { KnotGrid } from './KnotGrid';
import { PathKnotDiagram } from './PathKnotDiagram';
import { TyingKnotDiagram } from './TyingKnotDiagram';
import { OpenTyingKnotDiagram } from './OpenTyingKnotDiagram';

export const KnotDisplay = () => {
  const knot = CurrentKnot.value;
  const interweaved =
    CurrentInterweaved.value ?? new InterweavedKnot({ parts: knot.parts, bights: knot.bights, strands: [] });

  return (
    <>
      <h3 className='text-center'>
        {knot.bights}B x {knot.parts}P {knot.sobre ? 'sobre' : 'casa'} knot
      </h3>
      <div className='grid grid-cols-2'>
        <AlgorithmDiagram knot={knot} />
        <KnotGrid />
        {/* <PathKnotDiagram knot={interweaved} strandWidth={14} gapWidth={6} /> */}
        {/* <TyingKnotDiagram knot={interweaved} strandWidth={14} gapWidth={6} /> */}
        {/* <OpenTyingKnotDiagram knot={interweaved} strandWidth={14} gapWidth={6} /> */}
        <div className='col-span-2'>
          <RunList knot={knot} />
        </div>
      </div>
    </>
  );
};
