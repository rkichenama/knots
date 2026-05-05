import * as React from 'react';
import styled from 'styled-components';

const ResizeContainer = styled.div`
  overflow: hidden;
  resize: auto;
`;

export const TileKnotDiagram: React.FC = () => {
  return (
    <ResizeContainer>
      <canvas style={{ display: 'block' }} />
    </ResizeContainer>
  );
};
