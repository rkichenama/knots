import * as React from 'react';
import styled from 'styled-components';
import { CurrentKnot, KnotError } from '../data/CurrentKnot';
import { AlgorithmDiagram } from './AlgorithmDiagram';
import { RunList } from './RunList';
import { KnotGrid } from './KnotGrid';
import { TileKnotDiagram } from './TileKnotDiagram';

export const KnotDisplay = () => {
  const knot = CurrentKnot.value;

  return (
    <>
      <h3 className="text-center">{knot.bights}B x {knot.parts}P {knot.sobre ? 'sobre' : 'casa'} knot</h3>
      <div className='grid grid-cols-2'>
        <AlgorithmDiagram knot={knot} />
        <KnotGrid />
        <TileKnotDiagram knot={knot} color={'purple'} />
        <div className="col-span-2">
          <RunList knot={knot} />
        </div>
      </div>
    </>
  );
};