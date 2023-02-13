import { derived, Readable, Unsubscriber } from "svelte/store";
import { AsyncReadable, AsyncStatus } from "./async-readable";

type StoreValue<T> = T extends AsyncReadable<infer U>
  ? U
  : T extends Readable<infer U>
  ? U
  : never;

/** One or more values from `Readable` stores. */
type StoresValues<T> = {
  [K in keyof T]: StoreValue<T[K]>;
};

type DeriveFn<S, T> = (
  values: StoresValues<S>
) =>
  | T
  | ((values: StoresValues<S>, set: (v: T) => void) => Unsubscriber | void);

export function asyncDerived<
  T,
  S extends Array<AsyncReadable<any> | Readable<any>>
>(stores: S, derive: DeriveFn<S, T>): AsyncReadable<T> {
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
      value: derive(v as StoresValues<S>),
    };
  });
}

// Joins all the given `AsyncReadables` into a single `AsyncReadable`
export function join<S extends Array<AsyncReadable<any> | Readable<any>>>(
  stores: S
): AsyncReadable<StoresValues<S>> {
  return asyncDerived(stores, (i) => i);
}

export function deriveStore<T, S extends Array<Readable<any>>>(
  stores: S,
  deriveStoreFn: (stores: StoresValues<S>) => Readable<T>
): Readable<T> {
  return derived(stores, (values, set) => {
    return deriveStoreFn(values as StoresValues<S>).subscribe(set);
  });
}

export function asyncDeriveStore<
  T,
  S extends Array<AsyncReadable<any> | Readable<any>>
>(
  stores: S,
  deriveStoreFn: (stores: StoresValues<S>) => AsyncReadable<T>
): AsyncReadable<T> {
  return derived(stores, (values, set) => {
    const firstError = values.find(
      (v) => v && (v as AsyncStatus<any>).status === "error"
    );
    const firstLoading = values.find(
      (v) => v && (v as AsyncStatus<any>).status === "pending"
    );

    const v = values.map((v) => {
      if (v && v.status === "complete") return v.value;
      return v;
    });
    if (firstError) {
      set(firstError);
    } else if (firstLoading) {
      set(firstLoading);
    } else {
      return deriveStoreFn(v as StoresValues<S>).subscribe(set);
    }
  });
}
