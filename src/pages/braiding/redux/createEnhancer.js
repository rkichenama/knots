import { compose } from '../util';

export default (...middlewares) => createStore => (...args) => {
  const base = createStore(...args);
  let dispatch = () => {};
  const api = {
    getState: base.getState,
    dispatch: (...args) => dispatch(...args)
  };
  const operations = middlewares.map(middleware => middleware(api));
  dispatch = compose(...operations)(base.dispatch);

  return {
    ...base,
    dispatch
  };
};
