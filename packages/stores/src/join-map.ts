import { HoloHashMap, ReadableHoloHashMap } from "@holochain-open-dev/utils";
import { HoloHash } from "@holochain/client";
import { asyncDerived, join } from "./async-derived";
import { AsyncReadable } from "./async-readable";

// Joins all the stores in a HoloHashMap of `AsyncReadables`
export function joinMap<
  H extends HoloHash,
  S,
  T extends AsyncReadable<S>,
  M extends ReadableHoloHashMap<H, T>
>(holoHashMap: M): AsyncReadable<ReadableHoloHashMap<H, S>> {
  const storeArray = holoHashMap
    .entries()
    .map(([key, store]) => asyncDerived([store], (v) => [key, v] as [H, S]));
  const arrayStore = join(storeArray);
  return asyncDerived(
    [arrayStore],
    ([entries]) => new HoloHashMap<H, S>(entries)
  );
}
