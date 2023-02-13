import { HoloHashMap } from "@holochain-open-dev/utils";
import { HoloHash } from "@holochain/client";
import { asyncDerived, join } from "./async-derived";
import { AsyncReadable } from "./async-readable";
import { derived, Readable } from "svelte/store";

type StoreValue<T> = T extends Readable<infer U> ? U : never;

type AsyncStoreValue<T> = T extends AsyncReadable<infer U> ? U : never;

// Joins all the stores in a HoloHashMap of `AsyncReadables`
export function joinMap<H extends HoloHash, T extends Readable<any>>(
  holoHashMap: ReadonlyMap<H, T>
): Readable<ReadonlyMap<H, StoreValue<T>>> {
  const storeArray = Array.from(holoHashMap.entries()).map(([key, store]) =>
    derived([store], ([v]) => [key, v] as [H, StoreValue<T>])
  );
  const arrayStore = derived(storeArray, (i) => i);
  return derived([arrayStore], ([entries]) => {
    return new HoloHashMap<H, StoreValue<T>>(entries);
  });
}

// Joins all the stores in a HoloHashMap of `AsyncReadables`
export function asyncJoinMap<H extends HoloHash, T extends AsyncReadable<any>>(
  holoHashMap: ReadonlyMap<H, T>
): AsyncReadable<ReadonlyMap<H, AsyncStoreValue<T>>> {
  const storeArray = Array.from(holoHashMap.entries()).map(([key, store]) =>
    asyncDerived([store], ([v]) => [key, v] as [H, AsyncStoreValue<T>])
  );
  const arrayStore = join(storeArray);
  return asyncDerived([arrayStore], ([entries]) => {
    return new HoloHashMap<H, AsyncStoreValue<T>>(entries);
  });
}
