import * as React from 'react';
import styled from 'styled-components';
import { Knot } from '../lib';

type RunListProps = {
  knot: Knot;
}
export const RunList: React.FC<RunListProps> = ({ knot }) => (
  <div>
    <h3>Half Cycles</h3>
    <HalfCycleList>
      {knot.steps().map((row) => (
          <HalfCycleRow key={row}>{row}</HalfCycleRow>
        ))}
    </HalfCycleList>
  </div>
);

const HalfCycleList = styled.ol``;
const HalfCycleRow = styled.li``;