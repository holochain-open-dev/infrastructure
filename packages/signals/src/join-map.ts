import { HoloHashMap } from "@holochain-open-dev/utils";
import { HoloHash } from "@holochain/client";
import {
  AsyncComputed,
  AsyncResult,
  AsyncSignal,
  joinAsync,
  JoinAsyncOptions,
} from "async-signals";

/**
 * Joins all the results in a HoloHashMap of `AsyncSignals`
 */
export function joinAsyncMap<K extends HoloHash, T, V extends AsyncSignal<any>>(
  map: ReadonlyMap<K, V>,
  joinOptions?: JoinAsyncOptions
): AsyncSignal<ReadonlyMap<K, T>> {
  const signalArray = Array.from(map.entries()).map(
    ([key, signal]) =>
      new AsyncComputed<[K, T]>(() => {
        const result = signal.get();
        if (result.status !== "completed") return result;
        const value = [key, result.value] as [K, T];
        return {
          status: "completed",
          value,
        };
      })
  );
  const arraySignal = joinAsync(signalArray, joinOptions);

  return new AsyncComputed(() => {
    const result = arraySignal.get();
    if (result.status !== "completed") return result;

    const value = new HoloHashMap<K, T>(result.value);
    return {
      status: "completed",
      value,
    } as AsyncResult<ReadonlyMap<K, T>>;
  });
}
