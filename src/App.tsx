import * as React from 'react';
import { KnotControls } from './components/KnotControls';
import { KnotDisplay } from './components/KnotDisplay';

export const App = () => (
  <div>
    <KnotControls />
    <hr />
    <KnotDisplay />
  </div>
);
