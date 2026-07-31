import { encode } from "@msgpack/msgpack";
import {
  Action,
  ActionHash,
  ActionType,
  AgentPubKey,
  Entry,
  EntryHash,
  Record,
  RecordEntry,
  fakeActionHash,
  fakeAgentPubKey,
  fakeEntryHash,
  randomByteArray,
} from "@holochain/client";

import { AnyAction } from "./action.js";
import { hash, HashType } from "./hash.js";

export async function fakeCreateAction(
  entry_hash?: EntryHash,
  author?: AgentPubKey
): Promise<AnyAction> {
  if (!entry_hash) entry_hash = await fakeEntryHash();
  if (!author) author = await fakeAgentPubKey();
  return {
    header: {
      author,
      timestamp: Date.now() * 1000,
      action_seq: 10,
      prev_action: await fakeActionHash(),
    },
    data: {
      type: ActionType.Create,
      entry_type: {
        App: {
          entry_index: 0,
          visibility: "Public",
          zome_index: 0,
        },
      },
      entry_hash,
    },
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
): Promise<AnyAction> {
  if (!deletes_address) deletes_address = await fakeActionHash();
  if (!deletes_entry_address) deletes_entry_address = await fakeEntryHash();
  if (!author) author = await fakeAgentPubKey();
  return {
    header: {
      author,
      timestamp: Date.now() * 1000,
      action_seq: 10,
      prev_action: await fakeActionHash(),
    },
    data: {
      type: ActionType.Delete,
      deletes_address,
      deletes_entry_address,
    },
  };
}

export async function fakeUpdateEntry(
  original_action_address?: ActionHash,
  original_entry_address?: EntryHash,
  author?: AgentPubKey,
  entry: Entry = fakeEntry()
): Promise<AnyAction> {
  if (!original_action_address)
    original_action_address = await fakeActionHash();
  if (!original_entry_address) original_entry_address = await fakeEntryHash();
  if (!author) author = await fakeAgentPubKey();
  return {
    header: {
      author,
      timestamp: Date.now() * 1000,
      action_seq: 10,
      prev_action: await fakeActionHash(),
    },
    data: {
      type: ActionType.Update,
      original_entry_address,
      original_action_address,
      entry_hash: hash(entry, HashType.ENTRY),
      entry_type: {
        App: {
          entry_index: 0,
          visibility: "Public",
          zome_index: 0,
        },
      },
    },
  };
}

export async function fakeRecord(
  action: AnyAction,
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
        content: action as Action,
        hash: hash(action, HashType.ACTION),
      },
      signature: await randomByteArray(256),
    },
  };
}

export async function fakeCreateLinkAction(
  base_address?: ActionHash,
  target_address?: ActionHash,
  link_type: number = 0,
  tag: any = undefined
): Promise<AnyAction> {
  if (base_address) base_address = await fakeActionHash();
  if (target_address) target_address = await fakeActionHash();

  return {
    header: {
      author: await fakeAgentPubKey(),
      timestamp: Date.now() * 1000,
      action_seq: 10,
      prev_action: await fakeActionHash(),
    },
    data: {
      type: ActionType.CreateLink,
      base_address,
      target_address,
      link_type,
      tag,
      zome_index: 0,
    },
  };
}

export async function fakeDeleteLinkAction(
  link_add_address?: ActionHash
): Promise<AnyAction> {
  if (link_add_address) link_add_address = await fakeActionHash();

  return {
    header: {
      author: await fakeAgentPubKey(),
      timestamp: Date.now() * 1000,
      action_seq: 10,
      prev_action: await fakeActionHash(),
    },
    data: {
      type: ActionType.DeleteLink,
      base_address: link_add_address,
      link_add_address,
    },
  };
}
