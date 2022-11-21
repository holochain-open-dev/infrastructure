import { Record, Create } from "@holochain/client";
import { decode } from "@msgpack/msgpack";
import { timestampToMillis } from "./timestamp";

export class EntryRecord<T> {
  constructor(public record: Record) {}

  get actionHash() {
    return this.record.signed_action.hashed.hash;
  }

  get action() {
    const action = this.record.signed_action.hashed.content;
    return {
      ...action,
      timestamp: timestampToMillis(action.timestamp)
    };
  }

  get entry() {
    return decode((this.record.entry as any).Present.entry) as T;
  }

  get entryHash() {
    return (this.record.signed_action.hashed.content as Create).entry_hash;
  }
}
