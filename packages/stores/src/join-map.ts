import { HoloHashMap } from "@holochain-open-dev/utils";
import { HoloHash } from "@holochain/client";
import { asyncDerived, join } from "./async-derived";
import { AsyncReadable } from "./async-readable";

type StoreValue<T> = T extends AsyncReadable<infer U> ? U : never;

// Joins all the stores in a HoloHashMap of `AsyncReadables`
export function joinMap<H extends HoloHash, T extends AsyncReadable<any>>(
  holoHashMap: ReadonlyMap<H, T>
): AsyncReadable<ReadonlyMap<H, StoreValue<T>>> {
  const storeArray = Array.from(holoHashMap.entries()).map(([key, store]) =>
    asyncDerived([store], ([v]) => [key, v] as [H, StoreValue<T>])
  );
  const arrayStore = join(storeArray);
  return asyncDerived([arrayStore], ([entries]) => {
    return new HoloHashMap<H, StoreValue<T>>(entries);
  });
}
