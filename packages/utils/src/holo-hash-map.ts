import {
  ActionHash,
  AgentPubKey,
  CellId,
  decodeHashFromBase64,
  DnaHash,
  encodeHashToBase64,
  EntryHash,
  HoloHash,
} from "@holochain/client";
import flatMap from "lodash-es/flatMap";

export class HoloHashMap<K extends HoloHash, V> implements Map<K, V> {
  _map: Map<string, V>;

  constructor(initialEntries?: Array<[K, V]>) {
    this._map = new Map();
    if (initialEntries) {
      for (const [key, value] of initialEntries) {
        this.set(key, value);
      }
    }
  }

  has(key: K) {
    return this._map.has(encodeHashToBase64(key));
  }

  get(key: K): V {
    return this._map.get(encodeHashToBase64(key));
  }

  set(key: K, value: V) {
    this._map.set(encodeHashToBase64(key), value);
    return this;
  }

  delete(key: K) {
    return this._map.delete(encodeHashToBase64(key));
  }

  keys() {
    return Array.from(this._map.keys())
      .map((h) => decodeHashFromBase64(h) as K)
      [Symbol.iterator]();
  }

  values() {
    return this._map.values();
  }

  entries() {
    return Array.from(this._map.entries())
      .map(([h, v]) => [decodeHashFromBase64(h), v] as [K, V])
      [Symbol.iterator]();
  }

  clear() {
    return this._map.clear();
  }

  forEach(
    callbackfn: (value: V, key: K, map: Map<K, V>) => void,
    thisArg?: any
  ): void {
    return this._map.forEach((value, key) => {
      callbackfn(value, decodeHashFromBase64(key) as K, this);
    }, thisArg);
  }

  get size() {
    return this._map.size;
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.entries();
  }

  get [Symbol.toStringTag](): string {
    return this._map[Symbol.toStringTag];
  }
}

export class EntryHashMap<T> extends HoloHashMap<EntryHash, T> {}
export class ActionHashMap<T> extends HoloHashMap<ActionHash, T> {}
export class AgentPubKeyMap<T> extends HoloHashMap<AgentPubKey, T> {}
export class DnaHashMap<T> extends HoloHashMap<DnaHash, T> {}

export class CellMap<T> {
  // Segmented by DnaHash / AgentPubKey
  #cellMap: HoloHashMap<DnaHash, HoloHashMap<AgentPubKey, T>> =
    new HoloHashMap();

  constructor(initialEntries?: Array<[CellId, T]>) {
    if (initialEntries) {
      for (const [cellId, value] of initialEntries) {
        this.set(cellId, value);
      }
    }
  }

  get([dnaHash, agentPubKey]: CellId): T | undefined {
    return this.#cellMap.get(dnaHash)
      ? this.#cellMap.get(dnaHash).get(agentPubKey)
      : undefined;
  }

  has(cellId: CellId): boolean {
    return !!this.get(cellId);
  }

  valuesForDna(dnaHash: DnaHash): Array<T> {
    const dnaMap = this.#cellMap.get(dnaHash);
    return dnaMap ? Array.from(dnaMap.values()) : [];
  }

  agentsForDna(dnaHash: DnaHash): Array<AgentPubKey> {
    const dnaMap = this.#cellMap.get(dnaHash);
    return dnaMap ? Array.from(dnaMap.keys()) : [];
  }

  set([dnaHash, agentPubKey]: CellId, value: T) {
    if (!this.#cellMap.get(dnaHash))
      this.#cellMap.set(dnaHash, new HoloHashMap());
    this.#cellMap.get(dnaHash).set(agentPubKey, value);
  }

  delete([dnaHash, agentPubKey]: CellId) {
    if (this.#cellMap.get(dnaHash)) {
      this.#cellMap.get(dnaHash).delete(agentPubKey);

      if (Array.from(this.#cellMap.get(dnaHash).keys()).length === 0) {
        this.#cellMap.delete(dnaHash);
      }
    }
  }

  entries(): Array<[CellId, T]> {
    return this.cellIds().map(
      (cellId) => [cellId, this.get(cellId)] as [CellId, T]
    );
  }

  filter(fn: (value: T) => boolean): CellMap<T> {
    const entries = this.entries();

    const mappedValues = entries.filter(([id, v]) => fn(v));

    return new CellMap(mappedValues);
  }

  map<R>(fn: (value: T) => R): CellMap<R> {
    const entries = this.entries();

    const mappedValues = entries.map(([id, v]) => [id, fn(v)] as [CellId, R]);

    return new CellMap(mappedValues);
  }

  values(): Array<T> {
    return this.cellIds().map((cellId) => this.get(cellId) as T);
  }

  cellIds(): Array<CellId> {
    const dnaHashes = Array.from(this.#cellMap.keys());

    return flatMap(dnaHashes, (dnaHash) =>
      Array.from(this.#cellMap.get(dnaHash).keys()).map(
        (agentPubKey) => [dnaHash, agentPubKey] as CellId
      )
    );
  }
}

// Subset of ReadonlyMap, with only the get function
export interface GetonlyMap<K, V> {
  get(key: K): V;
}

export class LazyMap<K, V> implements GetonlyMap<K, V> {
  map = new Map<K, V>();
  constructor(protected newValue: (hash: K) => V) {}

  get(hash: K): V {
    if (!this.map.has(hash)) {
      this.map.set(hash, this.newValue(hash));
    }
    return this.map.get(hash);
  }
}

export class LazyHoloHashMap<K extends HoloHash, V>
  implements GetonlyMap<K, V>
{
  map = new HoloHashMap<K, V>();
  constructor(protected newValue: (hash: K) => V) {}

  get(hash: K): V {
    if (!this.map.has(hash)) {
      this.map.set(hash, this.newValue(hash));
    }
    return this.map.get(hash);
  }
}
