import { AsyncReadable, AsyncStatus } from "async-readable";
import { writable } from "svelte/store";

// Starts loading, and retries until the promise returns a correct value
// If there is an error it is discarded
// Use this for queries you know are valid but may take some time to return a correct response (eg. eventual consistency)
export function retryUntilSuccess<T>(
  fn: () => Promise<T>,
  pollInterval: number = 1000
): AsyncReadable<T> {
  const store = writable<AsyncStatus<T>>({ status: "pending" });

  const tryOnce = async () => {
    const value = await fn();
    store.set({
      status: "complete",
      value,
    });
  };

  const tryAndRetry = async () => {
    try {
      await tryOnce();
    } catch (e) {
      setTimeout(() => tryOnce(), pollInterval);
    }
  };

  tryAndRetry();

  return {
    subscribe: store.subscribe,
  };
}
