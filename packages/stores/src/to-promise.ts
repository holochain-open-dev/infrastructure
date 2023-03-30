// Converts an asyncreadable to a promise

import { AsyncReadable } from "./async-readable.js";

// Wll subscribe to the given store until it gives a complete or an error message, and then unsubscribe
export async function toPromise<T>(
  asyncReadable: AsyncReadable<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const unsubscribe = asyncReadable.subscribe((value) => {
      if (value.status === "complete") {
        resolve(value.value);
        setTimeout(() => unsubscribe());
      }
      if (value.status === "error") {
        reject(value.error);
        setTimeout(() => unsubscribe());
      }
    });
  });
}
