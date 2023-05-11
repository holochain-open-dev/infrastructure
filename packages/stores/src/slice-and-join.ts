import { GetonlyMap, HoloHashMap, slice } from "@holochain-open-dev/utils";
import { HoloHash } from "@holochain/client";
import { joinAsyncMap } from "./join-map.js";
import { AsyncReadable } from "./async-readable.js";

export type Option<T> = T | undefined;

// Takes a map of AsyncReadables, it gets the stores for the given hashes,
// and returns those stores joined
export function sliceAndJoin<H extends HoloHash, T>(
  map: GetonlyMap<H, AsyncReadable<Option<T>>>,
  hashes: Array<H>
): AsyncReadable<ReadonlyMap<H, T>> {
  const s = slice(map, hashes);

  const hs = new HoloHashMap(
    Array.from(s.entries()).filter(([h, v]) => v !== undefined)
  ) as HoloHashMap<H, AsyncReadable<T>>;

  return joinAsyncMap(hs);
}
