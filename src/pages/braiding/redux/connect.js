import React, { useContext } from 'react';

const WithStore = createContext({});

export const Provider = ({ store, children }) => {
  return (
    <WithStore.Provider value={store} {...{ children }} />
  )
};

const noop = () => ({});
export const connect = (mapStateToProps = noop, mapDispatchToProps = noop) => BaseComponent => props => {
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

  const [, rerender] = useState({});
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
