import { AgentPubKey, Timestamp } from '@holochain/client';
import { DhtOpHash } from './common';

export enum ValidationStatus {
  Valid,
  Rejected,
  Abandoned,
}

export interface ValidationReceipt {
  dht_op_hash: DhtOpHash;
  validation_status: ValidationStatus;
  validator: AgentPubKey;
  when_integrated: Timestamp;
}
