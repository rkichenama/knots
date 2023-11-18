import * as React from 'react';
import styled from 'styled-components';
import { CurrentKnot, KnotError } from '../data/CurrentKnot';
import { AlgorithmDiagram } from './AlgorithmDiagram';
import { RunList } from './RunList';
import { KnotGrid } from './KnotGrid';

export const KnotDisplay = () => {
  const knot = CurrentKnot.value;

  return (
    <>
      {KnotError.value && <h4>{KnotError.value}</h4>}
      <h2>{knot.bights}B x {knot.parts}P {knot.sobre ? 'sobre' : 'casa'} knot</h2>
      <AlgorithmDiagram knot={knot} />
      <KnotGrid />
      <RunList knot={knot} />
    </>
  );
};