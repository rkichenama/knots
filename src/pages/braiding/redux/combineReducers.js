export default  (reducers = {}) => (state, action) => {
  const newState = {};
  Object.entries(reducers)
    .forEach(([ slice, reducer ]) => {
      newState[slice] = reducer(state[slice], action)
    });
  return newState;
};
