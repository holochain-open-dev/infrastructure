import { mapValues } from "@holochain-open-dev/utils";
import { HoloHash } from "@holochain/client";
import { JoinAsyncOptions } from "async-derived.js";
import { AsyncReadable } from "./async-readable.js";
import { joinAsyncMap } from "./join-map.js";

/**
 * Maps the given map to AsyncReadable stores,
 * and then returns the map of those stores joined
 */
export function mapAndJoin<H extends HoloHash, T, U>(
  map: ReadonlyMap<H, T>,
  fn: (value: T, key: H) => AsyncReadable<U>,
  joinOptions?: JoinAsyncOptions
): AsyncReadable<ReadonlyMap<H, U>> {
  return joinAsyncMap(mapValues(map, fn), joinOptions);
}
