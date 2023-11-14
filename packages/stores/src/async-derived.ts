import { Readable } from "svelte/store";
import { derived } from "./derived.js";
import { AsyncReadable, AsyncStatus } from "./async-readable.js";

type StoreValue<T> = T extends AsyncReadable<infer U>
  ? U
  : T extends Readable<infer U>
  ? U
  : never;
type AsyncStoreValue<T> = T extends AsyncReadable<infer U> ? U : never;

const isPromise = (v) => typeof v === "object" && typeof v.then === "function";

/**
 * Derives an `AsyncReadable` only when the state of the given store is completed.
 *
 * Example:
 *
 * ```js
 * import { asyncDerived, asyncReadable } from '@holochain-open-dev/stores';
 *
 * const asyncReadable = asyncReadable(async set => set(await fetch("https://some/url")));
 *
 * const composedResult = asyncDerived(asyncReadable, async (result) => fetch(`https://some/other/dependant/${result}`));
 * ```
 */
export function asyncDerived<T, S extends AsyncReadable<any>>(
  store: S,
  derive: (value: AsyncStoreValue<S>) => Promise<T> | T
): AsyncReadable<T> {
  return derived(store, (value, set) => {
    if (value.status === "error") set(value);
    else if (value.status === "pending") set(value);
    else {
      const v = derive(value.value);
      if (isPromise(v)) {
        set({ status: "pending" });
        Promise.resolve(v)
          .then((v) => {
            set({
              status: "complete",
              value: v,
            });
          })
          .catch((error) => {
            set({
              status: "error",
              error,
            });
          });
      } else {
        set({
          status: "complete",
          value: v as T,
        });
      }
    }
  });
}

/**
 * Defines the behavior of the joining of the `AsyncReadables`
 */
export interface JoinAsyncOptions {
  /**
   * 'bubbles': the first error encountered in the collection of stores is going to be automatically returned
   * 'filter_out': all errors encountered in the collection of stores are going to be filtered out, returning only those stores that completed successfully
   */
  errors?: "filter_out" | "bubble";
  /**
   * 'bubbles': the first pending status encountered in the collection of stores is going to be automatically returned
   * 'filter_out': all pending status encountered in the collection of stores are going to be filtered out, returning only those stores that completed successfully
   */
  pendings?: "filter_out" | "bubble";
}

/**
 *  Joins an array of `AsyncReadables` into a single `AsyncReadable` of the array of values
 */
export function joinAsync<T>(
  stores: [AsyncReadable<T>],
  joinOptions?: JoinAsyncOptions
): AsyncReadable<[T]>;
export function joinAsync<T, U>(
  stores: [AsyncReadable<T>, AsyncReadable<U>],
  joinOptions?: JoinAsyncOptions
): AsyncReadable<[T, U]>;
export function joinAsync<T, U, V>(
  stores: [AsyncReadable<T>, AsyncReadable<U>, AsyncReadable<V>],
  joinOptions?: JoinAsyncOptions
): AsyncReadable<[T, U, V]>;
export function joinAsync<T, U, V, W>(
  stores: [
    AsyncReadable<T>,
    AsyncReadable<U>,
    AsyncReadable<V>,
    AsyncReadable<W>
  ],
  joinOptions?: JoinAsyncOptions
): AsyncReadable<[T, U, V, W]>;
export function joinAsync<T, U, V, W, X>(
  stores: [
    AsyncReadable<T>,
    AsyncReadable<U>,
    AsyncReadable<V>,
    AsyncReadable<W>,
    AsyncReadable<X>
  ],
  joinOptions?: JoinAsyncOptions
): AsyncReadable<[T, U, V, W, X]>;
export function joinAsync<T, U, V, W, X, Y>(
  stores: [
    AsyncReadable<T>,
    AsyncReadable<U>,
    AsyncReadable<V>,
    AsyncReadable<W>,
    AsyncReadable<X>,
    AsyncReadable<Y>
  ],
  joinOptions?: JoinAsyncOptions
): AsyncReadable<[T, U, V, W, X, Y]>;
export function joinAsync<T, U, V, W, X, Y, Z>(
  stores: [
    AsyncReadable<T>,
    AsyncReadable<U>,
    AsyncReadable<V>,
    AsyncReadable<W>,
    AsyncReadable<X>,
    AsyncReadable<Y>,
    AsyncReadable<Z>
  ],
  joinOptions?: JoinAsyncOptions
): AsyncReadable<[T, U, V, W, X, Y, Z]>;
export function joinAsync<T, U, V, W, X, Y, Z, A>(
  stores: [
    AsyncReadable<T>,
    AsyncReadable<U>,
    AsyncReadable<V>,
    AsyncReadable<W>,
    AsyncReadable<X>,
    AsyncReadable<Y>,
    AsyncReadable<Z>,
    AsyncReadable<A>
  ],
  joinOptions?: JoinAsyncOptions
): AsyncReadable<[T, U, V, W, X, Y, Z, A]>;
export function joinAsync<T, U, V, W, X, Y, Z, A, B>(
  stores: [
    AsyncReadable<T>,
    AsyncReadable<U>,
    AsyncReadable<V>,
    AsyncReadable<W>,
    AsyncReadable<X>,
    AsyncReadable<Y>,
    AsyncReadable<Z>,
    AsyncReadable<A>,
    AsyncReadable<B>
  ],
  joinOptions?: JoinAsyncOptions
): AsyncReadable<[T, U, V, W, X, Y, Z, A, B]>;
export function joinAsync<T, U, V, W, X, Y, Z, A, B, C>(
  stores: [
    AsyncReadable<T>,
    AsyncReadable<U>,
    AsyncReadable<V>,
    AsyncReadable<W>,
    AsyncReadable<X>,
    AsyncReadable<Y>,
    AsyncReadable<Z>,
    AsyncReadable<A>,
    AsyncReadable<B>,
    AsyncReadable<C>
  ],
  joinOptions?: JoinAsyncOptions
): AsyncReadable<[T, U, V, W, X, Y, Z, A, B, C]>;
export function joinAsync<T>(
  stores: Array<AsyncReadable<T>>,
  joinOptions?: JoinAsyncOptions
): AsyncReadable<Array<T>>;
export function joinAsync<T>(
  stores: Array<AsyncReadable<T>>,
  joinOptions?: JoinAsyncOptions
): AsyncReadable<Array<T>> {
  let options = {
    errors: "bubble",
    pendings: "bubble",
  };
  if (joinOptions) {
    options = {
      ...options,
      ...joinOptions,
    };
  }
  return derived(stores, (values): AsyncStatus<T[]> => {
    if (options.errors === "bubble") {
      const firstError = values.find(
        (v) => v && (v as AsyncStatus<any>).status === "error"
      );
      if (firstError) {
        return firstError as AsyncStatus<T[]>;
      }
    }
    if (options.pendings === "bubble") {
      const firstLoading = values.find(
        (v) => v && (v as AsyncStatus<any>).status === "pending"
      );
      if (firstLoading) {
        return firstLoading as AsyncStatus<T[]>;
      }
    }

    const v = values
      .filter((v) => v.status === "complete")
      .map((v) => (v as any).value as T);
    return {
      status: "complete",
      value: v,
    } as AsyncStatus<T[]>;
  });
}

export function deriveStore<T, S extends Readable<any>>(
  store: S,
  deriveStoreFn: (value: StoreValue<S>) => Readable<T>
): Readable<T> {
  return derived(store, (value, set) =>
    deriveStoreFn(value as StoreValue<S>).subscribe(set)
  );
}

export function asyncDeriveStore<T, S extends AsyncReadable<any>>(
  store: S,
  deriveStoreFn: (
    value: AsyncStoreValue<S>
  ) => AsyncReadable<T> | Promise<AsyncReadable<T>>
): AsyncReadable<T> {
  return derived(store, (value, set) => {
    if (value.status === "error") set(value);
    else if (value.status === "pending") set(value);
    else {
      const v = deriveStoreFn(value.value);
      if (isPromise(v)) {
        let unsubscribe;
        set({ status: "pending" });
        Promise.resolve(v)
          .then((v) => {
            unsubscribe = v.subscribe(set);
          })
          .catch((error) => {
            set({
              status: "error",
              error,
            });
          });
        return () => {
          if (unsubscribe) unsubscribe();
        };
      } else {
        return (v as AsyncReadable<T>).subscribe((v) => {
          set(v);
        });
      }
    }
    return undefined;
  });
}

// Derives the given store, and returns the value of the original joined with the derived value
export function asyncDeriveAndJoin<T, U>(
  store: AsyncReadable<T>,
  fn: (arg: T) => AsyncReadable<U>
): AsyncReadable<[T, U]> {
  return asyncDeriveStore(store, (v) => asyncDerived(fn(v), (u) => [v, u]));
}
