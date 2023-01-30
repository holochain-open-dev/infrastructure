import { encode } from "@msgpack/msgpack";
import {
  Record,
  Action,
  ActionType,
  Entry,
  EntryHash,
  AgentPubKey,
  ActionHash,
} from "@holochain/client";

export function fakeEntryHash(): EntryHash {
  const randomBytes = randomByteArray(36);
  return new Uint8Array([0x84, 0x21, 0x24, ...randomBytes]);
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
    entry_hash: fakeEntryHash(),
  };
}

export function fakeEntry(entry: any = "some data"): Entry {
  return {
    entry: encode(entry),
    entry_type: "App",
  };
}

export function fakeRecord(
  entry: Entry = fakeEntry(),
  action: Action = fakeCreateAction()
): Record {
  return {
    entry: {
      Present: entry,
    },
    signed_action: {
      hashed: {
        content: action,
        hash: fakeActionHash(),
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
