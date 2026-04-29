/* manage the config */
export const content = document.querySelector('#content');
export const styles = getComputedStyle(content);
const [ leftClr, rightClr ] = [ '--clr-left', '--clr-right' ].map(v => styles.getPropertyValue(v).trim());
export const defaultState = {
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

export const changeRows = rows => async dispatch => {
  dispatch({
    type: CHANGE_ROWS,
    payload: Number(rows)
  });
  dispatch(patternReducer.initializePattern());
};

export const changeStrands = (side, count) => async dispatch => {
  dispatch({
    type: CHANGE_STRANDS,
    payload: {
      side, count: Number(count)
    }
  });
  dispatch(patternReducer.initializePattern());
};

export const changePattern = (side, pattern) => async dispatch => {
  dispatch({
    type: CHANGE_PATTERN,
    payload: {
      side, pattern
    }
  });
  dispatch(patternReducer.initializePattern ());
};

export const changeColors = (side, color) => ({
  type: CHANGE_COLORS,
  payload: {
    side, color
  }
});

export default (state = defaultState, action) => {
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
};

export const rowsSelector = state => state.config.rows;
export const strandsLeftSelector = state => state.config.left;
export const strandsRightSelector = state => state.config.right;
export const patternRowsSelector = state => state.config.rows;
export const rightBasePatternSelector = state => state.config.rightBasePattern;
export const leftBasePatternSelector = state => state.config.leftBasePattern;
export const rightColorSelector = state => state.config.rightClr;
export const leftColorSelector = state => state.config.leftClr;
