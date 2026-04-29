import React from 'react';
import BraidingContext from '../context';
import { Actions } from '../reducer';
import { asValue, asWord, newArr } from '../util/funcs';

import './Weave.scss';

const calcPass = (track, reverse?: boolean) => {
  let [ currentlyOver, ...rest ] = track;
  let direc = [{ dir: asWord(currentlyOver), count: 1 }];
  rest.forEach(nub => {
    if (currentlyOver === nub) {
      direc[direc.length - 1].count++;
    } else {
      currentlyOver = nub;
      direc.push({ dir: asWord(currentlyOver), count: 1 });
    }
  });
  if (reverse) { direc = direc.reverse() }
  return direc.map(({ dir, count }) => `${dir}${count}`).join(' ').replace(/1/g, '');
};
const initializeRow = pattern => {
  return [].concat(...pattern.split(' ').map(asValue));
};
const withContext = (WrappedComponent: any): any => (
  (props: any) => {
    const context = React.useContext(BraidingContext);
    return (
      <WrappedComponent {...props} {...context} />
    );
  }
);

const Nub: React.FC<any> = ({ onClick = () => {}, isOver }) => {
  return (
    <div
      className={`nub right- left- ${isOver ? 'over' : 'under'}`}
      {...{onClick}}
    />
  );
};

const NubRow: React.FC<any> = ({ className, track = [], loc, setOver }) => (
  <div {...{ className }} data-dir={calcPass(track)}>
  {
    track.map((isOver, j) => (
      <Nub
        key={j}
        {...{ isOver }}
        onClick={() => setOver(...loc, j, !isOver)}
      />
    ))
  }
</div>
);

const NubRows: React.FC<any> = withContext(({ dispatch, pattern = [] }) => pattern.map(([ left, right ], i) => (
  <React.Fragment key={i}>
    <NubRow className='left-hand' loc={[ i, 0 ]} track={left} setOver={
      (row, side, nub, over) => { dispatch({ type: Actions.toggleOver, payload: { row, side, nub, over } }) }
    } />
    <NubRow className='right-hand' loc={[ i, 1 ]} track={right} setOver={
      (row, side, nub, over) => { dispatch({ type: Actions.toggleOver, payload: { row, side, nub, over } }) }
    } />
  </React.Fragment>
)));

const Weave: React.FC<any> = withContext(({ left, right, leftClr, rightClr }) => (
  <div id='weave' style={{
    '--clr-left': leftClr,
    '--clr-right': rightClr,
    gridTemplateColumns: `calc((24px * ${left}) + (2px * ${left - 1})) calc((24px * ${right}) + (2px * ${right - 1}))`,
    transform: `translateY(calc(12px + (28px * 0.7071 * ${Math.max(right, left)})))`
  } as React.CSSProperties}>
    <NubRows />
  </div>
));

const Sheet: React.FC<any> = () => (
  <div id='sheet' className='x4 y1 w9 h12' style={{ overflowY: 'auto' }}>
    <Weave />
  </div>
);

export default Sheet;
