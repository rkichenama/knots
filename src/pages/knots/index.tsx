import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const container = document.createElement('section');
const root = createRoot(container);
const element = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
// container.id = 'knots';
document.body.appendChild(container);
root.render(element);
