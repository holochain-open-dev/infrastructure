import {
  encodeHashToBase64,
  Entry,
  EntryHash,
  HoloHash,
} from "@holochain/client";
// @ts-ignore
import blake from "blakejs";
import { encode } from "@msgpack/msgpack";
import { Base64 } from "js-base64";
import sortKeys from "sort-keys";
import isPlainObject from "lodash-es/isPlainObject.js";

export enum HashType {
  AGENT,
  ENTRY,
  DHTOP,
  ACTION,
  DNA,
}

export const AGENT_PREFIX = "hCAk";
export const ENTRY_PREFIX = "hCEk";
export const DHTOP_PREFIX = "hCQk";
export const DNA_PREFIX = "hC0k";
export const ACTION_PREFIX = "hCkk";

function getPrefix(type: HashType) {
  switch (type) {
    case HashType.AGENT:
      return AGENT_PREFIX;
    case HashType.ENTRY:
      return ENTRY_PREFIX;
    case HashType.DHTOP:
      return DHTOP_PREFIX;
    case HashType.ACTION:
      return ACTION_PREFIX;
    case HashType.DNA:
      return DNA_PREFIX;
    default:
      return "";
  }
}

export function retype(hash: HoloHash, type: HashType): HoloHash {
  return new Uint8Array([
    ...Base64.toUint8Array(getPrefix(type)),
    ...hash.slice(3),
  ]);
}

export function hashEntry(entry: Entry): EntryHash {
  if (entry.entry_type === "Agent") return entry.entry;
  return hash(entry, HashType.ENTRY);
}

export function isHash(hash: string): boolean {
  return !![
    AGENT_PREFIX,
    ENTRY_PREFIX,
    DHTOP_PREFIX,
    DNA_PREFIX,
    ACTION_PREFIX,
  ].find((prefix) => hash.startsWith(`u${prefix}`));
}

// From https://github.com/holochain/holochain/blob/dc0cb61d0603fa410ac5f024ed6ccfdfc29715b3/crates/holo_hash/src/encode.rs
export function hash(content: any, type: HashType): HoloHash {
  const obj = isPlainObject(content) ? sortKeys(content) : content;
  const bytesHash: Uint8Array = blake.blake2b(encode(obj), null, 32);

  const fullhash = new Uint8Array([
    ...Base64.toUint8Array(getPrefix(type)),
    ...bytesHash,
    ...locationBytes(bytesHash),
  ]);

  return fullhash;
}

export function locationBytes(bytesHash: HoloHash): Uint8Array {
  const hash128: Uint8Array = blake.blake2b(bytesHash, null, 16);

  const out = [hash128[0], hash128[1], hash128[2], hash128[3]];

  for (let i = 4; i < 16; i += 4) {
    out[0] ^= hash128[i];
    out[1] ^= hash128[i + 1];
    out[2] ^= hash128[i + 2];
    out[3] ^= hash128[i + 3];
  }
  return new Uint8Array(out);
}

export function getHashType(hash: HoloHash): HashType {
  const hashExt = encodeHashToBase64(hash).slice(1, 5);

  if (hashExt === AGENT_PREFIX) return HashType.AGENT;
  if (hashExt === DNA_PREFIX) return HashType.DNA;
  if (hashExt === DHTOP_PREFIX) return HashType.DHTOP;
  if (hashExt === ACTION_PREFIX) return HashType.ACTION;
  if (hashExt === ENTRY_PREFIX) return HashType.ENTRY;

  return HashType.ENTRY;
}
