import { Action, ActionHash } from "@holochain/client";
import { EntryRecord } from "./entry-record";
import { RecordBag } from "./record-bag";

export interface EntryState<T> {
  deleted: boolean;
  lastUpdate: EntryRecord<T>;
}

export function entryState<T>(bag: RecordBag<T>, originalActionHash: ActionHash): EntryState<T> | undefined {
  const original = bag.entryRecord(originalActionHash);

  const deleted = bag.deletes.get(originalActionHash)?.length > 0;

  const updatesActionsHashes = bag.updates.get(originalActionHash) || [];
  const updatesActions = updatesActionsHashes.map(h => [h, bag.actionMap.get(h)] as [ActionHash, Action]).filter((a) => a[1] !== undefined);
  const orderedActions = updatesActions.sort((a, b) => b[1].timestamp - a[1].timestamp);

  const lastActionHash = orderedActions.length === 0 ? original?.actionHash : orderedActions[0][0];

  if (!lastActionHash) return undefined;

  const lastUpdate = bag.entryRecord(lastActionHash);

  return {
    deleted,
    lastUpdate
  }
}
