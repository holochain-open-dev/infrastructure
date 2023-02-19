import { derived, Readable } from "svelte/store";
import { AsyncReadable, AsyncStatus } from "./async-readable.js";

type StoreValue<T> = T extends AsyncReadable<infer U>
  ? U
  : T extends Readable<infer U>
  ? U
  : never;
type AsyncStoreValue<T> = T extends AsyncReadable<infer U>
  ? U
  : T extends Readable<infer U>
  ? U
  : never;

/** One or more values from `Readable` stores. */
type StoresValues<T> = {
  [K in keyof T]: StoreValue<T[K]>;
};
const isPromise = (v) => typeof v === "object" && typeof v.then === "function";
export function asyncDerived<T, S extends AsyncReadable<any>>(
  store: S,
  derive: (value: AsyncStoreValue<S>) => T
): AsyncReadable<T> {
  return derived(store, (value, set) => {
    if (value.status === "error") set(value as AsyncStatus<T>);
    else if (value.status === "pending") set(value as AsyncStatus<T>);
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
          value: v,
        });
      }
    }
  });
}

// Joins all the given `AsyncReadables` into a single `AsyncReadable`
export function join<S extends Array<AsyncReadable<any> | Readable<any>>>(
  stores: S
): AsyncReadable<StoresValues<S>> {
  return derived(stores, (values) => {
    const firstError = values.find(
      (v) => v && (v as AsyncStatus<any>).status === "error"
    );
    if (firstError) {
      return firstError;
    }
    const firstLoading = values.find(
      (v) => v && (v as AsyncStatus<any>).status === "pending"
    );
    if (firstLoading) {
      return firstLoading;
    }

    const v = values.map((v) => {
      if (v && v.status === "complete") return v.value;
      return v;
    });
    return {
      status: "complete",
      value: v,
    };
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
    if (value.status === "error") set(value as AsyncStatus<T>);
    else if (value.status === "pending") set(value as AsyncStatus<T>);
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
        return (v as AsyncReadable<T>).subscribe(set);
      }
    }
    return undefined;
  });
}
