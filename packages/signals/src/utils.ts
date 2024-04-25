import { AsyncComputed, AsyncSignal } from "async-signals";
import { Signal } from "signal-polyfill";

/**
 * Adds logs to watched, unwatched, and new value events
 */
export function withLogger<S>(s: AsyncSignal<S>, name: string): AsyncSignal<S> {
  return new AsyncComputed(
    () => {
      const result = s.get();
      // eslint-disable-next-line
      console.log(`new value for "${name}"`, result);

      return result;
    },
    {
      [Signal.subtle.watched]: () => {
        // eslint-disable-next-line
        console.log(`"${name}" is being watched`);
      },
      [Signal.subtle.unwatched]: () => {
        // eslint-disable-next-line
        console.log(`"${name}" has been unwatched`);
      },
    }
  );
}
