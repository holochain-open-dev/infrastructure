import { derived, Readable } from "svelte/store";
import { AsyncReadable, AsyncStatus } from "./async-readable";

type Stores =
  | Readable<any>
  | [Readable<any>, ...Array<Readable<any>>]
  | Array<Readable<any>>;

type StoreValue<T> = T extends AsyncReadable<infer U>
  ? U
  : T extends Readable<infer U>
  ? U
  : never;

/** One or more values from `Readable` stores. */
type StoresValues<T> = {
  [K in keyof T]: StoreValue<T[K]>;
};

export function asyncDerived<
  T,
  S extends Array<AsyncReadable<any> | Readable<any>>
>(stores: S, derive: (values: StoresValues<S>) => T): AsyncReadable<T> {
  return derived(stores, (values) => {
    const firstError = values.find(
      (v) => (v as AsyncStatus<any>).status === "error"
    );
    if (firstError) {
      return firstError;
    }
    const firstLoading = values.find(
      (v) => (v as AsyncStatus<any>).status === "loading"
    );
    if (firstLoading) {
      return firstLoading;
    }

    const v = values.map((v) => {
      if (v.status === "complete") return v.value;
      return v;
    });

    return {
      status: "complete",
      value: derive(v as StoresValues<S>),
    };
  });
}
