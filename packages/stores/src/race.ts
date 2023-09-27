import { derived } from "./derived.js";
import { AsyncReadable, AsyncStatus } from "./async-readable.js";

/**
 * Returns the value of the first store that completes
 * After the first value is received, the value of this store won't change
 */
export function race<T>(stores: Array<AsyncReadable<T>>): AsyncReadable<T> {
  let found: T | undefined;
  return derived(stores, (values) => {
    if (found)
      return {
        status: "complete",
        value: found,
      } as AsyncStatus<T>;

    const firstCompleted = values.find((v) => v.status === "complete");
    if (firstCompleted) {
      found = (firstCompleted as any).value as T;
      return {
        status: "complete",
        value: found,
      } as AsyncStatus<T>;
    }

    return {
      status: "pending",
    } as AsyncStatus<T>;
  });
}
