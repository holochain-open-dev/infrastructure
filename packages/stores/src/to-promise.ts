// Converts an asyncreadable to a promise

import { AsyncReadable } from "./async-readable.js";

/**
 * Subscribes to the given store until it gives a complete or an error message, and then unsubscribe
 */
export async function toPromise<T>(
  asyncReadable: AsyncReadable<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const unsubscribe = asyncReadable.subscribe((value) => {
      if (value.status === "complete") {
        // Without this setTimeout, unsubscribe won't execute???
        setTimeout(() => {
          unsubscribe();
          resolve(value.value);
        });
      }
      if (value.status === "error") {
        // Without this setTimeout, unsubscribe won't execute???
        setTimeout(() => {
          unsubscribe();
          reject(value.error);
        });
      }
    });
  });
}
