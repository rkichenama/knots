import * as React from 'react';
import styled from 'styled-components';
import { Knot } from '../lib';

type KnotListProps = {
  knot: Knot;
};

export const AlgorithmDiagram: React.FC<KnotListProps> = ({
  knot: { topCyclicBightNumber, botCyclicBightNumber, topCodingPattern, botCodingPattern, coding }
}) => (
  <div>
    <h3>Algorithm Diagram</h3>
    <table>
      <tbody>
        <Row items={topCodingPattern} />
        <Row items={topCyclicBightNumber} />
        <Row items={coding.split("")} />
        <Row items={botCyclicBightNumber} />
        <Row items={botCodingPattern} />
      </tbody>
    </table>
  </div>
);

const Cell = styled.td`
  text-align: center;
`;

const Row = ({ items }: { items: string[] }) => (
  <tr>
    {items.map((item, col) => (
      <Cell key={`${col}-${item}`}>{item}</Cell>
    ))}
  </tr>
);