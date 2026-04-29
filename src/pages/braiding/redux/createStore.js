export default (initialReducer, initialState = {}, enhancer) => {
  if (enhancer) {
    return enhancer(createStore)(initialReducer, initialState);
  }

  let reducer = initialReducer;
  let subscribers = [];
  let state = reducer(initialState, { type: '__INIT__' });

  const store = {
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
      store.dispatch({ type: '__REPLACE__' });
    }
  };
  return store;
};
