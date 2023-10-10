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
 *  Joins an array of `AsyncReadables` into a single `AsyncReadable` of the array of values
 */
export function joinAsync<T>(stores: [AsyncReadable<T>]): AsyncReadable<[T]>;
export function joinAsync<T, U>(
  stores: [AsyncReadable<T>, AsyncReadable<U>]
): AsyncReadable<[T, U]>;
export function joinAsync<T, U, V>(
  stores: [AsyncReadable<T>, AsyncReadable<U>, AsyncReadable<V>]
): AsyncReadable<[T, U, V]>;
export function joinAsync<T, U, V, W>(
  stores: [
    AsyncReadable<T>,
    AsyncReadable<U>,
    AsyncReadable<V>,
    AsyncReadable<W>
  ]
): AsyncReadable<[T, U, V, W]>;
export function joinAsync<T, U, V, W, X>(
  stores: [
    AsyncReadable<T>,
    AsyncReadable<U>,
    AsyncReadable<V>,
    AsyncReadable<W>,
    AsyncReadable<X>
  ]
): AsyncReadable<[T, U, V, W, X]>;
export function joinAsync<T, U, V, W, X, Y>(
  stores: [
    AsyncReadable<T>,
    AsyncReadable<U>,
    AsyncReadable<V>,
    AsyncReadable<W>,
    AsyncReadable<X>,
    AsyncReadable<Y>
  ]
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
  ]
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
  ]
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
  ]
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
  ]
): AsyncReadable<[T, U, V, W, X, Y, Z, A, B, C]>;
export function joinAsync<T>(
  stores: Array<AsyncReadable<T>>
): AsyncReadable<Array<T>>;
export function joinAsync<T>(
  stores: Array<AsyncReadable<T>>
): AsyncReadable<Array<T>> {
  return derived(stores, (values): AsyncStatus<T[]> => {
    const firstError = values.find(
      (v) => v && (v as AsyncStatus<any>).status === "error"
    );
    if (firstError) {
      return firstError as AsyncStatus<T[]>;
    }
    const firstLoading = values.find(
      (v) => v && (v as AsyncStatus<any>).status === "pending"
    );
    if (firstLoading) {
      return firstLoading as AsyncStatus<T[]>;
    }

    const v = values.map((v) => (v as any).value as T);
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
