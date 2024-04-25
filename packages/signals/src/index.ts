import { Signal } from "signal-polyfill";

export * from "./join-map.js";
export * from "./utils.js";
export * from "./holochain.js";

// Omit joinAsyncMap because we provide the holohash implementation version in join-map.ts
export {
  AsyncComputed,
  AsyncResult,
  AsyncSignal,
  AsyncState,
  fromPromise,
  joinAsync,
  JoinAsyncOptions,
  toPromise,
} from "async-signals";

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
