import { decode } from "@msgpack/msgpack";

import { AnyAction, AnyRecord, NewEntryActionData } from "./action.js";
import { timestampToMillis } from "./timestamp.js";

export function decodeEntry<T>(record: AnyRecord): T | undefined {
  const entry = (record.entry as any)?.Present?.entry;
  return decode(entry) as T;
}

export class EntryRecord<T> {
  constructor(public record: AnyRecord) {}

  get actionHash() {
    return this.record.signed_action.hashed.hash;
  }

  get action(): AnyAction {
    const action = this.record.signed_action.hashed.content;
    return {
      header: {
        ...action.header,
        timestamp: timestampToMillis(action.header.timestamp),
      },
      data: action.data,
    };
  }

  get entry() {
    return decodeEntry<T>(this.record);
  }

  get entryHash() {
    return (
      this.record.signed_action.hashed.content.data as NewEntryActionData
    ).entry_hash;
  }
}

export function decodeCountersignedEntry<T>(record: AnyRecord): T | undefined {
  const entry = (record.entry as any)?.Present?.entry[1];
  return decode(entry) as T;
}

export class CountersignedEntryRecord<T> extends EntryRecord<T> {
  get entry(): T {
    return decodeCountersignedEntry(this.record) as T;
  }
}
