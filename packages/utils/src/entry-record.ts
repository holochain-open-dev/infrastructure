import { Record, Create } from "@holochain/client";
import { decode } from "@msgpack/msgpack";
import { timestampToMillis } from "./timestamp.js";

export function decodeEntry<T>(record: Record): T | undefined {
  const entry = (record.entry as any)?.Present?.entry;
  return decode(entry) as T;
}

export class EntryRecord<T> {
  constructor(public record: Record) {}

  get actionHash() {
    return this.record.signed_action.hashed.hash;
  }

  get action() {
    const action = this.record.signed_action.hashed.content;
    return {
      ...action,
      timestamp: timestampToMillis(action.timestamp),
    };
  }

  get entry() {
    return decodeEntry<T>(this.record);
  }

  get entryHash() {
    return (this.record.signed_action.hashed.content as Create).entry_hash;
  }
}
