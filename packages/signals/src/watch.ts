import { Signal } from "signal-polyfill";

export function watch<T>(
  signal: Signal.State<T> | Signal.Computed<T>,
  callback: (value: T) => void
): () => void {
  const w = new Signal.subtle.Watcher(() => {
    setTimeout(() => {
      callback(signal.get());
    });
  });
  w.watch(signal);

  return () => {
    w.unwatch(signal);
  };
}
