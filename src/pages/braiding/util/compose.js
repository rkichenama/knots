export const compose = (...fns) => (
  fns.length
    ? fns.length > 1
      ? fns.reduce((a, b) => (...args) => a(b(...args)))
      : fns[0]
    : p => p
)