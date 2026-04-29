/* fake imports */
const { Fragment, useState, useEffect, useContext, useRef, createContext } = React;
const { render } = ReactDOM;
/* fake imports */

/* helpers */
const newArr = (n, v) => (new Array(n)).fill(v);
const asWord = isOver => (isOver && 'o') || 'u';
const asValue = word => {
  word = word.trim();
  if (word.includes(' ')) {
    return [].concat(...word.split(' ').map(asValue));
  }
  let n = 1;
  let isOver = true;
  try {
    const [ matchedNum ] = (word.match(/\d+/) || []);
    n = Number(matchedNum || 1);
    isOver = /^o/.test(word);
  } catch (error) { /* */ }
  return newArr(n, isOver);
};
const calcPass = (track, reverse) => {
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
const compressPattern = (left, right, leftClr, rightClr, matrix) => {
  return [
    left,
    right,
    leftClr,
    rightClr,
    matrix.map(
      r => r.map(
        c => parseInt(c.map(v => v && 1 || 0).join(''), 2).toString(36)
      ).join('|')
    ).join(';')
  ].join(',');
};
const decompressPattern = str => {
  const [ left, right, leftClr, rightClr, patternStr ] = str.split(',');
  const len = [ left, right ];
  return {
    left, right, leftClr, rightClr,
    pattern: patternStr
      .split(';')
      .map(row => row
        .split('|')
        .map((side, i) => parseInt(side, 36)
          .toString(2)
          .padStart(len[i], '0')
          .split('')
          .map(nub => !!parseInt(nub, 2))
        )
      )
  }
};
/* helpers */

/* redux */
const createStore = (initialReducer, initialState = {}, enhancer) => {
  if (enhancer) {
    return enhancer(createStore)(initialReducer, initialState);
  }
  let reducer = initialReducer;
  let subscribers = [];
  let state = reducer(initialState, { type: '__INIT__' });
  return {
    getState () { return state },
    dispatch (action) {
      state = reducer(state, action);
      subscribers.forEach(listener => listener());
    },
    subscribe (listener) {
      subscribers.push(listener);
      return () => {
        subscribers = subscribers.filter(subscriber => subscriber !== listener);
      }
    },
    replaceReducer (newReducer) {
      reducer = newReducer;
      this.dispatch({ type: '__REPLACE__' });
    }
  };
};

const WithStore = createContext({});

const connect = (mapStateToProps = () => ({}), mapDispatchToProps = () => ({})) => BaseComponent => props => {
  const store = useContext(WithStore);
  const state = store.getState();
  const { dispatch, subscribe, replaceReducer } = store;
  const stateProps = mapStateToProps(state, props);
  let dispatchProps = {};
  if (typeof mapDispatchToProps === 'function') {
    dispatchProps = mapDispatchToProps(dispatch, props);
  }
  if (typeof mapDispatchToProps === 'object') {
    Object.entries(mapDispatchToProps)
      .map(([ key, action ]) => {
        dispatchProps[key] = (...args) => dispatch(action(...args));
      })
  }

  const [s, rerender] = useState({});
  useEffect(() => subscribe(() => {
    rerender(stateProps);
  }), [stateProps]);

  return (
    <BaseComponent {...{
        ...props,
        ...stateProps,
        ...dispatchProps,
        dispatch,
        subscribe,
        replaceReducer
      }} />
  );
};

const StoreProvider = ({ store, children }) => {
  return (
    <WithStore.Provider value={store} {...{ children }} />
  )
};

const Reducer = (reducers = {}) => (state, action) => {
  const newState = {};
  Object.entries(reducers)
    .forEach(([ slice, reducer ]) => {
      newState[slice] = reducer(state[slice], action)
    });
  return newState;
};
/* redux */

/* redux setup */
const initialState = {};
const configReducer = (() => {
  /* manage the config */
  const content = document.querySelector('#content');
  const styles = getComputedStyle(content);
  const [ leftClr, rightClr ] = [ '--clr-left', '--clr-right' ].map(v => styles.getPropertyValue(v).trim());
  const defaultState = {
    left: 8,
    leftBasePattern: 'u2 o2',
    leftClr,
    right: 8,
    rightBasePattern: 'u2 o2',
    rightClr,
    rows: 40,
  };
  const CHANGE_ROWS = 'CHANGE_ROWS';
  const CHANGE_STRANDS = 'CHANGE_STRANDS';
  const CHANGE_PATTERN = 'CHANGE_PATTERN';
  const CHANGE_COLORS = 'CHANGE_COLORS';
  const changeRows = rows => async dispatch => {
    dispatch({
      type: CHANGE_ROWS,
      payload: Number(rows)
    });
    dispatch(patternReducer.initializePattern());
  };
  const changeStrands = (side, count) => async dispatch => {
    dispatch({
      type: CHANGE_STRANDS,
      payload: {
        side, count: Number(count)
      }
    });
    dispatch(patternReducer.initializePattern());
  };
  const changePattern = (side, pattern) => async dispatch => {
    dispatch({
      type: CHANGE_PATTERN,
      payload: {
        side, pattern
      }
    });
    dispatch(patternReducer.initializePattern ());
  };
  const changeColors = (side, color) => ({
    type: CHANGE_COLORS,
    payload: {
      side, color
    }
  });
  return {
    default: (state = defaultState, action) => {
      switch (action.type) {
        case CHANGE_ROWS:
          return {
            ...state,
            rows: action.payload
          };
        case CHANGE_STRANDS:
          return {
            ...state,
            [action.payload.side]: action.payload.count
          };
        case CHANGE_PATTERN:
          return {
            ...state,
            [`${action.payload.side}BasePattern`]: action.payload.pattern
          };
        case CHANGE_COLORS:
          content.style.setProperty(`--clr-${action.payload.side}`, action.payload.color);
          return {
            ...state,
            [`${action.payload.side}Clr`]: action.payload.color
          };
        default: return state;
      }
    },
    changeRows,
    changeStrands,
    changePattern,
    changeColors,
    rowsSelector: state => state.config.rows,
    strandsLeftSelector: state => state.config.left,
    strandsRightSelector: state => state.config.right,
    patternRowsSelector: state => state.config.rows,
    rightBasePatternSelector: state => state.config.rightBasePattern,
    leftBasePatternSelector: state => state.config.leftBasePattern,
    rightColorSelector: state => state.config.rightClr,
    leftColorSelector: state => state.config.leftClr
  };
})();
const patternReducer = (() => {
  /* manage the pattern */
  const defaultState = [];
  const SET_PATTERN = 'SET_PATTERN';
  const SET_OVER = 'SET_OVER';
  const setPattern = payload => ({
    type: SET_PATTERN, payload
  });
  const setOver = (row, side, nub, over) => ({
    type: SET_OVER, payload: { row, side, nub, over }
  });
  const initializePattern = () => async (dispatch, getState) => {
    const [ left, right, rows, rightBase, leftBase ] = (state => ([
      configReducer.strandsLeftSelector(state),
      configReducer.strandsRightSelector(state),
      configReducer.patternRowsSelector(state),
      asValue(configReducer.rightBasePatternSelector(state)),
      asValue(configReducer.leftBasePatternSelector(state)),
    ]))(getState());
    const pattern = newArr(rows, false)
      .map(_ => ([
        newArr(left, true).map((_, i) => leftBase[i % leftBase.length]),
        newArr(right, true).map((_, i) => rightBase[i % rightBase.length])
      ]));
    dispatch(setPattern(pattern));
  };
  return {
    default: (state = defaultState, action) => {
      switch (action.type) {
        case SET_PATTERN:
          return action.payload;
        case SET_OVER: {
          const { row, side, nub, over } = action.payload;
          return state.map(
            (line, r) => line.map(
              (hand, s) => hand.map(
                (cross, n) => (
                  r === row && s === side && n === nub
                    ? over
                    : cross
                )
              )
            )
          );
        }
        default: return state;
      }
    },
    initializePattern,
    setPattern,
    setOver,
    patternRowsSelector: state => state.pattern,
    patternTrackSelector: (state, { loc }) => state.pattern[loc[0]][loc[1]]
  };
})();
const reducer = Reducer({
  config: configReducer.default,
  pattern: patternReducer.default,
});
const store = createStore(
  reducer,
  initialState,
  // compatible thunk enhancer
  createStore => {
    return (initialReducer, initialState) => {
      const base = createStore(initialReducer, initialState);
      const dispatch = action => {
        if (typeof action === 'function') {
          action(dispatch, base.getState);
        } else {
          base.dispatch(action);
        }
      };
      return { ...base, dispatch };
    };
  }
);
// const store = createStore(reducer, initialState);
/* redux setup */

/* components */
const Nub = ({ onClick = () => {}, isOver }) => {
  return (
    <div
      className={`nub right- left- ${isOver ? 'over' : 'under'}`}
      {...{onClick}}
    />
  );
};

const NubRow = connect(
  (s, p) => ({
    track: patternReducer.patternTrackSelector(s, p)
  }),
  { setOver: patternReducer.setOver }
)(({ className, track, loc, setOver }) => {
  return (
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
});

const ConnectedNubRows = connect(
  s => ({
    pattern: patternReducer.patternRowsSelector(s)
  })
)(({ pattern }) => {
  return pattern.map(([ left, right], i) => (
    <Fragment key={i}>
      <NubRow className='left-hand' loc={[i, 0]} />
      <NubRow className='right-hand' loc={[i, 1]} />
    </Fragment>
  ));
});

const Weave = connect(
  s => ({
    left: configReducer.strandsLeftSelector(s),
    right: configReducer.strandsRightSelector(s)
  })
)(({ rows = 10, left, right }) => (
  <div
    className='weave'
    style={{
      gridTemplateColumns: `calc((24px * ${left}) + (2px * ${left - 1})) calc((24px * ${right}) + (2px * ${right - 1}))`,
      transform: `translateY(calc(12px + (28px * 0.7071 * ${Math.max(right, left)})))`
    }}
  >
    <ConnectedNubRows {...{ rows }} />
  </div>
));

const Controls = connect(
  s => ({
    left: configReducer.strandsLeftSelector(s),
    right: configReducer.strandsRightSelector(s),
    rightBase: configReducer.rightBasePatternSelector(s),
    leftBase: configReducer.leftBasePatternSelector(s),
    rightClr: configReducer.rightColorSelector(s),
    leftClr: configReducer.leftColorSelector(s),
    pattern: patternReducer.patternRowsSelector(s),
    rows: configReducer.rowsSelector(s)
  }),
  {
    changeRows: configReducer.changeRows,
    changeStrands: configReducer.changeStrands,
    changePattern: configReducer.changePattern,
    changeColors: configReducer.changeColors,
    setPattern: patternReducer.setPattern
  }
)(({ left, right, leftBase, rightBase, leftClr, rightClr, changeRows, changeStrands, changePattern, changeColors, pattern, setPattern, rows }) => {
  const importEl = useRef(null);
  const performImport = () => {
    const { current: textarea } = importEl;
    const str = textarea.value.trim();
    if (str.length) {
      try {
        const { left, right, leftClr, rightClr, pattern } = decompressPattern(str);
        console.log(left, right, pattern)
        changeStrands('left', left);
        changeStrands('right', right);
        changeColors('left', leftClr);
        changeColors('right', rightClr);
        setPattern(pattern);
      } catch (error) {
        console.log(error);
      }
    }
  };
  return (
    <div className='controls'>
      <label>Weave Rows</label>
      <input
        type='range'
        max={60}
        min={4}
        value={rows}
        step={4}
        onChange={evt => changeRows(evt.target.value) }
      />
      <span>{rows}</span>
      <hr />
      <label>Strands on Left</label>
      <input
        type='range'
        max={16}
        min={4}
        value={left}
        onChange={evt => changeStrands('left', Number(evt.target.value)) }
      />
      <span>{left}</span>
      <label>Left Color(s)</label>
      <input type='color' value={leftClr} onChange={evt => {
          changeColors('left', evt.target.value.trim())
        }} />
      <label>Base Pattern</label>
      <input type='text' value={leftBase} onChange={evt => {
          (evt.target.value.length >= 1) && changePattern('left', evt.target.value)
        }} />
      <hr />
      <label>Strands on Right</label>
      <input
        type='range'
        max={16}
        min={4}
        value={right}
        onChange={evt => changeStrands('right', Number(evt.target.value)) }
      />
      <span>{right}</span>
      <label>Right Color(s)</label>
      <input type='color' value={rightClr} onChange={evt => {
          changeColors('right', evt.target.value.trim())
        }} />
      <label>Base Pattern</label>
      <input type='text' value={rightBase} onChange={evt => {
          (evt.target.value.length >= 1) && changePattern('right', evt.target.value)
        }} />
      <hr />
      <label className='full'>Current Pattern</label>
      <textarea rows={5} value={
          compressPattern(left, right, leftClr, rightClr, pattern)
        }/>
      <hr />
      <textarea rows={5} ref={importEl} />
      <button className='full' onClick={performImport}>Import Pattern</button>
    </div>
  );
});

const App = connect(
  () => {},
  { initializePattern: patternReducer.initializePattern }
)(({ initializePattern }) => {
  useEffect(() => {
    initializePattern();
  }, []);
  return (
    <div id='app'>
      <Controls />
      <div className='sheet'>
        <Weave rows={40} />
      </div>
    </div>
  )
});
/* components */

addEventListener('DOMContentLoaded', () => {
  render(
    <StoreProvider {...{ store }}>
      <App />
    </StoreProvider>,
    document.getElementById('content')
  )
});
