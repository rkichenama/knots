import React from 'react';
import { render } from 'react-dom';
import App from './App';

((d) => {
  const main = d.createElement('main');
  main.style.display = 'contents';
  d.body.appendChild(main);
  render(<App />, main);
})(document);