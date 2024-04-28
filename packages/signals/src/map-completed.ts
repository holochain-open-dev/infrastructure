import { AsyncComputed, AsyncSignal } from "async-signals";

/**
 * Transforms the value for the given signal, when its status is 'completed'.
 *
 * When the status of the given `AsyncSignal` is other than 'completed', it returns that result.
 */
export function mapCompleted<T, U>(
  asyncSignal: AsyncSignal<T>,
  mapFn: (value: T) => U
): AsyncSignal<U> {
  return new AsyncComputed(() => {
    const result = asyncSignal.get();
    if (result.status !== "completed") return result;
    const value = mapFn(result.value);
    return {
      status: "completed",
      value,
    };
  });
}
