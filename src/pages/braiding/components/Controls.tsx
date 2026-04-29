import React, { ChangeEvent } from 'react';
import BraidingContext, { defaultValue } from '../context';
import { Actions } from '../reducer';
import { compressPattern, decompressPattern } from '../util/funcs';

import './Controls.scss';

const Controls: React.FC<any> = () => {
  const {
    dispatch,
    rows, left, right, leftClr, leftBase, rightClr, rightBase, pattern
  } = React.useContext(BraidingContext);
  const importEl = React.useRef(undefined as HTMLTextAreaElement);

  const changeRows = React.useCallback(
    (field: string, xform: Function = (v => v) ) => (evt: ChangeEvent) => {
      dispatch({
        type: Actions.changeInputs,
        payload: { [field]: xform((evt.target as HTMLInputElement).value) } })
    },
    [ dispatch ]
  );

  const performImport = React.useCallback(
    () => {
      const { current: textarea } = importEl;
      const str = textarea.value.trim();
      if (str.length) {
        try {
          const { rows, left, right, leftClr, rightClr, pattern } = decompressPattern(str);
          dispatch({ type: Actions.replaceState, payload: {
            ...defaultValue,
            rows, left, right, leftClr, rightClr, pattern
          }});
        } catch (error) {
          console.log(error);
        }
      }
    }, [ importEl.current ]
  )

  return (
    <div id='controls' className='x1 y1 w3 h12 as-table'>
      <div className='row'>
        <label>Weave Rows</label>
        <input
          type='range'
          max={60}
          min={4}
          value={rows}
          step={4}
          onChange={changeRows('rows', n => Number(n))}
        />
        <span>{rows}</span>
      </div>
      <hr className='w12' />
      <div className='row'>
        <label>Strands on Left</label>
        <input
          type='range'
          max={32}
          min={4}
          value={left}
          onChange={changeRows('left', n => Number(n))}
        />
        <span>{left}</span>
        <label>Left Color(s)</label>
        <input type='color' value={leftClr} onChange={changeRows('leftClr')} />
        <label>Base Pattern</label>
        <input type='text' value={leftBase} onChange={evt => {
          (evt.target.value.length >= 1) && changeRows('leftBase')(evt)
        }} />
      </div>
      <hr className='w12' />
      <div className='row'>
        <label>Strands on Right</label>
        <input
          type='range'
          max={32}
          min={4}
          value={right}
          onChange={changeRows('right', n => Number(n))}
        />
        <span>{right}</span>
        <label>Right Color(s)</label>
        <input type='color' value={rightClr} onChange={changeRows('rightClr')} />
        <label>Base Pattern</label>
        <input type='text' value={rightBase} onChange={evt => {
            (evt.target.value.length >= 1) && changeRows('rightBase')(evt)
          }} />
      </div>
      <hr className='w12' />
      <div className='row'>
        <label className='full'>Current Pattern</label>
        <textarea rows={5} readOnly value={
          compressPattern(rows, left, right, leftClr, rightClr, pattern)
        } onChange={() => {}}/>
      </div>
      <hr className='w12' />
      <div className='row'>
        <textarea rows={5} ref={importEl} />
        <button className='full'
          onClick={performImport}
        >Import Pattern</button>
      </div>
    </div>
  );
}
export default Controls;
