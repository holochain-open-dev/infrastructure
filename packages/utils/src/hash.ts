import { encode } from "@msgpack/msgpack";
import {
  Record,
  Action,
  ActionType,
  Entry,
  fakeAgentPubKey,
  fakeActionHash,
  fakeEntryHash,
} from "@holochain/client";

export function fakeCreateAction(): Action {
  return {
    type: ActionType.Create,
    author: fakeAgentPubKey(),
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

export function fakeEntry(): Entry {
  return {
    entry: encode("some data"),
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
