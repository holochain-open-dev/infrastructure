import { Record, Entry, SignedActionHashed } from '@holochain/client';

import { ValidationStatus } from './validation';

export interface EntryDetails {
  entry: Entry;
  actions: Array<SignedActionHashed>;
  rejected_actions: Array<SignedActionHashed>;
  deletes: Array<SignedActionHashed>;
  updates: Array<SignedActionHashed>;
  entry_dht_status: EntryDhtStatus;
}

export interface RecordDetails {
  record: Record;
  validation_status: ValidationStatus;
  deletes: Array<SignedActionHashed>;
  updates: Array<SignedActionHashed>;
}

export type Details =
  | {
      type: DetailsType.Record;
      content: RecordDetails;
    }
  | {
      type: DetailsType.Entry;
      content: EntryDetails;
    };

export enum DetailsType {
  Entry,
  Record,
}

export enum EntryDhtStatus {
  Live,
  /// This [Entry] has no actions that have not been deleted
  Dead,
  /// This [Entry] is awaiting validation
  Pending,
  /// This [Entry] has failed validation and will not be served by the DHT
  Rejected,
  /// This [Entry] has taken too long / too many resources to validate, so we gave up
  Abandoned,
  /// **not implemented** There has been a conflict when validating this [Entry]
  Conflict,
  /// **not implemented** The author has withdrawn their publication of this record.
  Withdrawn,
  /// **not implemented** We have agreed to drop this [Entry] content from the system. Action can stay with no entry
  Purged,
}
