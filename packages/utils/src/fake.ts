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
  fakeEntryHash,
  fakeAgentPubKey,
  fakeActionHash,
  randomByteArray,
} from "@holochain/client";
import { hash, HashType } from "./hash.js";

export async function fakeCreateAction(
  entry_hash?: EntryHash,
  author?: AgentPubKey
): Promise<Action> {
  if (!entry_hash) entry_hash = await fakeEntryHash();
  if (!author) author = await fakeAgentPubKey();
  return {
    type: ActionType.Create,
    author,
    timestamp: Date.now() * 1000,
    action_seq: 10,
    prev_action: await fakeActionHash(),
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

export async function fakeDeleteEntry(
  deletes_address?: ActionHash,
  deletes_entry_address?: EntryHash,
  author?: AgentPubKey
): Promise<Action> {
  if (!deletes_address) deletes_address = await fakeActionHash();
  if (!deletes_entry_address) deletes_entry_address = await fakeEntryHash();
  if (!author) author = await fakeAgentPubKey();
  return {
    type: ActionType.Delete,
    author,
    timestamp: Date.now() * 1000,
    action_seq: 10,
    prev_action: await fakeActionHash(),
    deletes_address,
    deletes_entry_address,
  };
}

export async function fakeUpdateEntry(
  original_action_address?: ActionHash,
  original_entry_address?: EntryHash,
  author?: AgentPubKey,
  entry: Entry = fakeEntry()
): Promise<Action> {
  if (!original_action_address)
    original_action_address = await fakeActionHash();
  if (!original_entry_address) original_entry_address = await fakeEntryHash();
  if (!author) author = await fakeAgentPubKey();
  return {
    type: ActionType.Update,
    author,
    timestamp: Date.now() * 1000,
    action_seq: 10,
    prev_action: await fakeActionHash(),
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

export async function fakeRecord(
  action: Action,
  entry?: Entry | undefined
): Promise<Record> {
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
      signature: await randomByteArray(256),
    },
  };
}
