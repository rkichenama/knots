export default ({ dispatch, getState }) => next => action => {
  if (typeof action === 'function') {
    action(dispatch, getState);
  } else {
    next(action);
  }
}
