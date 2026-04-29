/* manage the pattern */
const defaultState = [];
const SET_PATTERN = 'SET_PATTERN';
const SET_OVER = 'SET_OVER';

export const setPattern = payload => ({
  type: SET_PATTERN, payload
});

export const setOver = (row, side, nub, over) => ({
  type: SET_OVER, payload: { row, side, nub, over }
});

export const initializePattern = () => async (dispatch, getState) => {
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

export default (state = defaultState, action) => {
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
};

// selectors
export const patternRowsSelector = state => state.pattern;
export const patternTrackSelector = (state, { loc }) => state.pattern[loc[0]][loc[1]];
