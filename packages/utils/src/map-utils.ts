import { HoloHash } from "@holochain/client";
import { GetonlyMap, HoloHashMap, LazyHoloHashMap } from "./holo-hash-map.js";

/**
 * Create a new slice of this map that contains only the given keys
 */
export function slice<K extends HoloHash, V>(
  map: GetonlyMap<K, V>,
  keys: K[]
): ReadonlyMap<K, V> {
  const newMap = new HoloHashMap<K, V>();

  for (const key of keys) {
    newMap.set(key, map.get(key));
  }
  return newMap;
}

/**
 * Create a new map with only the keys that pass the given filter function
 */
export function pick<K extends HoloHash, V>(
  map: ReadonlyMap<K, V>,
  filter: (key: K) => boolean
): ReadonlyMap<K, V> {
  const values = pickBy(map, (_v, k) => filter(k));

  return new HoloHashMap(
    Object.values(values).map(({ hash, value }) => [hash, value])
  );
}

/**
 * Create a new map with only the key-value pairs that pass the given filter function
 */
export function pickBy<K extends HoloHash, V>(
  map: ReadonlyMap<K, V>,
  filter: (value: V, key: K) => boolean
): HoloHashMap<K, V> {
  const entries = Array.from(map.entries()).filter(([key, value]) =>
    filter(value, key)
  );

  return new HoloHashMap<K, V>(entries);
}

/**
 * Create a new map maintaining the keys while mapping the values with the given mapping function
 */
export function mapValues<K extends HoloHash, V, U>(
  map: ReadonlyMap<K, V>,
  mappingFn: (value: V, key: K) => U
): HoloHashMap<K, U> {
  const mappedMap = new HoloHashMap<K, U>();

  for (const [key, value] of map.entries()) {
    mappedMap.set(key, mappingFn(value, key));
  }
  return mappedMap;
}

/**
 * Map the given LazyHoloHashMap's values with the given mapping function
 */
export function mapLazyValues<K extends HoloHash, V, U>(
  map: LazyHoloHashMap<K, V>,
  mappingFn: (value: V, key: K) => U
): LazyHoloHashMap<K, U> {
  return new LazyHoloHashMap((key) => {
    const value = map.get(key);
    return mappingFn(value, key);
  });
}
