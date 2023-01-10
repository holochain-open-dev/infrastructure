import {
  Action,
  ActionHash,
  Delete,
  NewEntryAction,
  Record,
  Update,
} from "@holochain/client";
import uniqWith from "lodash-es/uniqWith";
import isEqual from "lodash-es/isEqual";

import { ActionHashMap, AgentPubKeyMap, EntryHashMap } from "./holo-hash-map";
import { EntryRecord } from "./entry-record";

export class RecordBag<T> {
  // Map of entry hash -> entry, already decoded
  public entryMap = new EntryHashMap<T>();

  // Map of action hash -> action
  // Timestamp is in milliseconds
  public actionMap = new ActionHashMap<Action>();

  // Map of entry hash -> all the actions that have created or updated to that entry
  public entryActions = new EntryHashMap<ActionHash[]>();

  // For each agent, contains all the actions it has authored
  public authorMap = new AgentPubKeyMap<ActionHash[]>();

  // For each action, all the actions that update it
  public updates = new ActionHashMap<ActionHash[]>();

  // For each action, all the actions that delete it
  public deletes = new ActionHashMap<ActionHash[]>();

  public get entriesByAuthor(): AgentPubKeyMap<T[]> {
    return this.authorMap
      .map((actionHashes) =>
        actionHashes.map((hash) => this.actionMap.get(hash))
      )
      .map((actions) =>
        actions
          .map((action) =>
            this.entryMap.get((action as NewEntryAction).entry_hash)
          )
          .filter((entry) => entry !== undefined)
      );
  }

  public get entryRecords() {
    return this.records.map((r) => new EntryRecord<T>(r));
  }
  public entryRecord(actionHash: ActionHash): EntryRecord<T> | undefined {
    const record = this.records.find((r) =>
      isEqual(r.signed_action.hashed.hash, actionHash)
    );
    return record ? new EntryRecord(record) : undefined;
  }

  constructor(protected records: Record[] = []) {
    this.add(records);
  }

  add(records: Record[]) {
    this.records = this.records.concat(records);

    for (const record of records) {
      const entryRecord = new EntryRecord<T>(record);

      if (entryRecord.entryHash) {
        this.entryMap.put(entryRecord.entryHash, entryRecord.entry);

        if (!this.entryActions.has(entryRecord.entryHash)) {
          this.entryActions.put(entryRecord.entryHash, []);
        }
        this.entryActions.put(
          entryRecord.entryHash,
          uniqWith(
            [
              ...this.entryActions.get(entryRecord.entryHash),
              entryRecord.actionHash,
            ],
            isEqual
          )
        );
      }
      this.actionMap.put(entryRecord.actionHash, entryRecord.action);

      if (!this.authorMap.has(entryRecord.action.author)) {
        this.authorMap.put(entryRecord.action.author, []);
      }
      this.authorMap.put(
        entryRecord.action.author,
        uniqWith(
          [
            ...this.authorMap.get(entryRecord.action.author),
            entryRecord.actionHash,
          ],
          isEqual
        )
      );

      if ((entryRecord.action as Update).original_action_address) {
        const originalActionAddress = (entryRecord.action as Update)
          .original_action_address;
        const currentUpdates = this.updates.get(originalActionAddress);
        this.updates.put(
          originalActionAddress,
          uniqWith([...currentUpdates, entryRecord.actionHash], isEqual)
        );
      }
      if ((entryRecord.action as Delete).deletes_address) {
        const originalActionAddress = (entryRecord.action as Delete)
          .deletes_address;
        const currentDeletes = this.deletes.get(originalActionAddress);
        this.deletes.put(
          originalActionAddress,
          uniqWith([...currentDeletes, entryRecord.actionHash], isEqual)
        );
      }
    }
  }

  addBag(recordBag: RecordBag<T>) {
    this.add(recordBag.records);
  }
}
