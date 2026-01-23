import { HoloHash, HoloHashMap } from "@holochain/client";
import { Readable } from "svelte/store";
import { derived } from "./derived.js";
import { asyncDerived, joinAsync, JoinAsyncOptions } from "./async-derived.js";
import { AsyncReadable } from "./async-readable.js";

export type StoreValue<T> = T extends Readable<infer U> ? U : never;

export type AsyncStoreValue<T> = T extends AsyncReadable<infer U> ? U : never;

/**
 * Joins all the stores in a HoloHashMap of `Readables`
 */
export function joinMap<H extends HoloHash, T extends Readable<any>>(
  holoHashMap: HoloHashMap<H, T>
): Readable<HoloHashMap<H, StoreValue<T>>> {
  const storeArray = Array.from(holoHashMap.entries()).map(([key, store]) =>
    derived([store], ([v]) => [key, v] as [H, StoreValue<T>])
  );
  const arrayStore = derived(storeArray, (i) => i);
  return derived(
    [arrayStore],
    ([entries]) => new HoloHashMap<H, StoreValue<T>>(entries)
  );
}

/**
 * Joins all the stores in a HoloHashMap of `AsyncReadables`
 */
export function joinAsyncMap<H extends HoloHash, T extends AsyncReadable<any>>(
  holoHashMap: HoloHashMap<H, T>,
  joinOptions?: JoinAsyncOptions
): AsyncReadable<HoloHashMap<H, AsyncStoreValue<T>>> {
  const storeArray = Array.from(holoHashMap.entries()).map(([key, store]) =>
    asyncDerived(store, (v) => [key, v] as [H, AsyncStoreValue<T>])
  );
  const arrayStore = joinAsync(storeArray, joinOptions);
  return asyncDerived(
    arrayStore,
    (entries) => new HoloHashMap<H, AsyncStoreValue<T>>(entries)
  );
}
