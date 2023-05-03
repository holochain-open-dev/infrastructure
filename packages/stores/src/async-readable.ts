import { isEqual } from "lodash-es";
import { readable, Readable, Subscriber, Unsubscriber } from "svelte/store";

export type AsyncStatus<T> =
  | { status: "pending" }
  | { status: "complete"; value: T }
  | { status: "error"; error: any };

export type AsyncReadable<T> = Readable<AsyncStatus<T>>;

/**
 * An `AsyncReadable<T>` is a `Readable` store that executes the given `Promise` the first time a subscriber subscribes to the store. It can have three states:
 *
 * - `pending`: the promise is still pending.
 * - `error`: there was an error in the execution of the promise.
 * - `complete`: the promise was completed.
 *
 * ```js
 * import { asyncReadable } from '@holochain-open-dev/stores';
 *
 * const someResult = asyncReadable(async set => {
 *   const value = await fetch("https://some/url");
 *   set(value);
 * });
 *
 * // Use as a normal svelte store
 * someResult.subscribe(status => { console.log(status); }); // Will first print `{ status: 'pending' }`, and later print `{ status: 'complete', value: ... }`
 * ```
 *
 * Like normal `readable` stores, it returns an unsubscribe function that gets called when the last subscriber unsubscribes:
 */
export function asyncReadable<T>(
  load: (set: Subscriber<T>) => Promise<Unsubscriber | void>
): AsyncReadable<T> {
  return readable<AsyncStatus<T>>({ status: "pending" }, (set) => {
    const asyncSet = (v) => set({ status: "complete", value: v });
    let unsubscribe: Unsubscriber | void;
    load(asyncSet)
      .then((u) => {
        unsubscribe = u;
      })
      .catch((e) => set({ status: "error", error: e }));

    return () => unsubscribe && unsubscribe();
  });
}

/**
 * Constructs an `AsyncReadable<T>` with the result of a promise, which it will execute only when the first subscriber subscribes.
 *
 * ```ts
 * import { lazyLoad } from '@holochain-open-dev/stores';
 *
 * const someResult = lazyLoad(async () => fetch("https://some/url"));
 *
 * // Use someResult as any other `AsyncReadable<T>`
 * ```
 */
export function lazyLoad<T>(load: () => Promise<T>): AsyncReadable<T> {
  return readable<AsyncStatus<T>>({ status: "pending" }, (set) => {
    load()
      .then((v) => {
        set({ status: "complete", value: v });
      })
      .catch((e) => set({ status: "error", error: e }));

    return () => {};
  });
}

/**
 * Constructs an `AsyncReadable<T>` that will call the given promise when the first subscriber subscribes,
 * and then will start executing that same promise in the given polling interval until the last subscriber unsubscribes.
 *
 * The value of the store will be replaced with the polling result, only if the polling is successful and the new value is different from the old one.
 * If the polling throws an error, that error is discarded.
 *
 * ```ts
 * import { lazyLoadAndPoll } from '@holochain-open-dev/stores';
 *
 * const someResult = lazyLoadAndPoll(async () => fetch("https://some/url"), 1000); // Poll every one second
 *
 * // Use someResult as any other `AsyncReadable<T>`
 * ```
 */
export function lazyLoadAndPoll<T>(
  load: () => Promise<T>,
  pollIntervalMs: number
): AsyncReadable<T> {
  return readable<AsyncStatus<T>>({ status: "pending" }, (set) => {
    let interval;
    let currentValue;
    let firstLoad = true;
    async function l() {
      const v = await load();
      if (firstLoad || !isEqual(v, currentValue)) {
        currentValue = v;
        firstLoad = false;
        set({ status: "complete", value: v });
      }
    }
    l()
      .then(() => {
        interval = setInterval(() => l().catch(() => {}), pollIntervalMs);
      })
      .catch((e) => {
        set({ status: "error", error: e });
      });
    return () => {
      if (interval) clearInterval(interval);
    };
  });
}

// Returns an already completed AsyncReadable with the given value
export function completed<T>(v: T): AsyncReadable<T> {
  return readable<AsyncStatus<T>>({
    status: "complete",
    value: v,
  });
}

// Takes a store and subscribes to it, causing it to always be active
export function alwaysSubscribed<T>(readable: Readable<T>): Readable<T> {
  readable.subscribe(() => {});

  return readable;
}
