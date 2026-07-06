// Rate-limit a function to at most once per `ms`, but always deliver the final
// call (trailing edge). Used to cap high-frequency realtime emits — e.g. a shape
// being dragged or text typed character-by-character — so we don't flood the
// relay while still syncing the last, authoritative state.
export function throttleTrailing(fn, ms) {
  let last = 0;
  let timer = null;
  let lastArgs = null;
  return function throttled(...args) {
    lastArgs = args;
    const now = Date.now();
    const wait = ms - (now - last);
    if (wait <= 0) {
      last = now;
      fn(...lastArgs);
    } else if (timer === null) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        fn(...lastArgs);
      }, wait);
    }
  };
}
