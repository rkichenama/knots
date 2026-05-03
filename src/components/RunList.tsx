import * as React from 'react';
import styled from 'styled-components';
import { Knot } from '../lib';

type RunListProps = {
  knot: Knot;
}
export const RunList: React.FC<RunListProps> = ({ knot }) => (
  <div>
    <h4>Half Cycles</h4>
    <ol className="list-decimal">
      {knot.steps().map((row) => (
          <li className="even:bg-gray-100 odd:bg-gray-200" key={row}
            dangerouslySetInnerHTML={{ __html: row
              .replace(/(\d+)/g, '<strong class="text-(--highlight)">$1</strong>')
             }}
          />
        ))}
    </ol>
  </div>
);