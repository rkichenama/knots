import * as React from 'react';
import { KnotControls } from './components/KnotControls';
import { KnotDisplay } from './components/KnotDisplay';

export const App = () => (
  <div className="flex flex-col gap-4 max-w-3xl mx-auto">
    <KnotControls />
    <hr />
    <KnotDisplay />
  </div>
);
