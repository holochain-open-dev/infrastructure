import { asyncReadable, AsyncReadable, AsyncStatus } from "./async-readable.js";

// Starts loading, and retries until the promise returns a correct value
// If there is an error it is discarded
// Use this for queries you know are valid but may take some time to return a correct response (eg. eventual consistency)
export function retryUntilSuccess<T>(
  fn: () => Promise<T>,
  pollInterval: number = 1000,
  maxRetries = 4
): AsyncReadable<T> {
  return asyncReadable(async (set) => {
    let retriesCount = 0;

    const tryOnce = async () => {
      retriesCount += 1;
      const value = await fn();
      set(value);
    };

    const tryAndRetry = async () => {
      try {
        await tryOnce();
      } catch (e) {
        if (maxRetries > retriesCount) {
          await new Promise((resolve, reject) => {
            setTimeout(
              () => tryAndRetry().then(resolve).catch(reject),
              pollInterval
            );
          });
        } else {
          throw e;
        }
      }
    };

    await tryAndRetry();
  });
}
