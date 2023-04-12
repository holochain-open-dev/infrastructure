import { encode } from "@msgpack/msgpack";
import {
  Record,
  Action,
  ActionType,
  Entry,
  EntryHash,
  AgentPubKey,
  ActionHash,
  RecordEntry,
  DnaHash,
} from "@holochain/client";
import { hash, HashType } from "./hash.js";

export function fakeEntryHash(): EntryHash {
  const randomBytes = randomByteArray(36);
  return new Uint8Array([0x84, 0x21, 0x24, ...randomBytes]);
}

export function fakeDnaHash(): DnaHash {
  const randomBytes = randomByteArray(36);
  return new Uint8Array([0x84, 0x2d, 0x24, ...randomBytes]);
}

/**
 * Generate a valid agent key of a non-existing agent.
 *
 * @returns An {@link AgentPubKey}.
 *
 * @public
 */
export function fakeAgentPubKey(): AgentPubKey {
  const randomBytes = randomByteArray(36);
  return new Uint8Array([0x84, 0x20, 0x24, ...randomBytes]);
}

/**
 * Generate a valid hash of a non-existing action.
 *
 * @returns An {@link ActionHash}.
 *
 * @public
 */
export function fakeActionHash(): ActionHash {
  const randomBytes = randomByteArray(36);
  return new Uint8Array([0x84, 0x29, 0x24, ...randomBytes]);
}

export function fakeCreateAction(
  entry_hash: EntryHash = fakeEntryHash(),
  author: AgentPubKey = fakeAgentPubKey()
): Action {
  return {
    type: ActionType.Create,
    author,
    timestamp: Date.now() * 1000,
    action_seq: 10,
    prev_action: fakeActionHash(),
    entry_type: {
      App: {
        entry_index: 0,
        visibility: { Public: null },
        zome_index: 0,
      },
    },
    entry_hash,
  };
}

export function fakeEntry(entry: any = "some data"): Entry {
  return {
    entry: encode(entry),
    entry_type: "App",
  };
}

export function fakeDeleteEntry(
  deletes_address: ActionHash = fakeActionHash(),
  deletes_entry_address: EntryHash = fakeEntryHash(),
  author: AgentPubKey = fakeAgentPubKey()
): Action {
  return {
    type: ActionType.Delete,
    author,
    timestamp: Date.now() * 1000,
    action_seq: 10,
    prev_action: fakeActionHash(),
    deletes_address,
    deletes_entry_address,
  };
}

export function fakeUpdateEntry(
  original_action_address: ActionHash = fakeActionHash(),
  entry: Entry = fakeEntry(),
  original_entry_address: EntryHash = fakeEntryHash(),
  author: AgentPubKey = fakeAgentPubKey()
): Action {
  return {
    type: ActionType.Update,
    author,
    timestamp: Date.now() * 1000,
    action_seq: 10,
    prev_action: fakeActionHash(),
    original_entry_address,
    original_action_address,
    entry_hash: hash(entry, HashType.ENTRY),
    entry_type: {
      App: {
        entry_index: 0,
        visibility: { Public: null },
        zome_index: 0,
      },
    },
  };
}

export function fakeRecord(action: Action, entry?: Entry | undefined): Record {
  let recordEntry: RecordEntry = {
    NotApplicable: null,
  };
  if (entry) {
    recordEntry = {
      Present: entry,
    };
  }

  return {
    entry: recordEntry,
    signed_action: {
      hashed: {
        content: action,
        hash: hash(action, HashType.ACTION),
      },
      signature: randomByteArray(256),
    },
  };
}

function randomByteArray(n: number): Uint8Array {
  const QUOTA = 65536;
  const a = new Uint8Array(n);
  for (let i = 0; i < n; i += QUOTA) {
    crypto.getRandomValues(a.subarray(i, i + Math.min(n - i, QUOTA)));
  }
  return a;
}
