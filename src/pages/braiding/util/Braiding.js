import React, { useEffect } from 'react';
import { initializePattern } from './reducers/pattern';

const Braiding = ({ initializePattern }) => {
  useEffect(() => { initializePattern(); }, []);

  return (
    <div id='app'>
      <Controls />
      <div className='sheet'>
        <Weave rows={40} />
      </div>
    </div>
  )
}

export default connect(
  () => ({}),
  { initializePattern }
)(Braiding);
