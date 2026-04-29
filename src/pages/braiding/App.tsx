import React from 'react';
import { BraidingProvider } from './context';
import Controls from './components/Controls';
import Weave from './components/Weave';

import './App.scss';

const Braiding: React.FC<any> = () => (
  <BraidingProvider>
    <Controls />
    <Weave />
  </BraidingProvider>
);

export default Braiding;
