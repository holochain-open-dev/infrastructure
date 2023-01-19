import { HoloHashMap, ReadHoloHashMap } from "@holochain-open-dev/utils";
import { HoloHash } from "@holochain/client";
import { asyncDerived, join } from "./async-derived";
import { AsyncReadable } from "./async-readable";

type StoreValue<T> = T extends AsyncReadable<infer U> ? U : never;

// Joins all the stores in a HoloHashMap of `AsyncReadables`
export function joinMap<H extends HoloHash, T extends AsyncReadable<any>>(
  holoHashMap: ReadHoloHashMap<H, T>
): AsyncReadable<ReadHoloHashMap<H, StoreValue<T>>> {
  const storeArray = holoHashMap
    .entries()
    .map(([key, store]) =>
      asyncDerived([store], (v) => [key, v] as [H, StoreValue<T>])
    );
  const arrayStore = join(storeArray);
  return asyncDerived(
    [arrayStore],
    ([entries]) => new HoloHashMap<H, StoreValue<T>>(entries)
  );
}
