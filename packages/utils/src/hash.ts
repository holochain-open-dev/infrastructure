import {
	Action,
	ActionHash,
	ActionType,
	Entry,
	EntryHash,
	HoloHash,
	encodeHashToBase64,
} from '@holochain/client';
import { encode } from '@msgpack/msgpack';
import blake from 'blakejs';
import { Base64 } from 'js-base64';
import isPlainObject from 'lodash-es/isPlainObject.js';
import sortKeys from 'sort-keys';

export enum HashType {
	AGENT,
	ENTRY,
	DHTOP,
	ACTION,
	DNA,
}

export const AGENT_PREFIX = 'hCAk';
export const ENTRY_PREFIX = 'hCEk';
export const DHTOP_PREFIX = 'hCQk';
export const DNA_PREFIX = 'hC0k';
export const ACTION_PREFIX = 'hCkk';

function getPrefix(type: HashType) {
	switch (type) {
		case HashType.AGENT:
			return AGENT_PREFIX;
		case HashType.ENTRY:
			return ENTRY_PREFIX;
		case HashType.DHTOP:
			return DHTOP_PREFIX;
		case HashType.ACTION:
			return ACTION_PREFIX;
		case HashType.DNA:
			return DNA_PREFIX;
		default:
			return '';
	}
}

export function retype(hash: HoloHash, type: HashType): HoloHash {
	return new Uint8Array([
		...Base64.toUint8Array(getPrefix(type)),
		...hash.slice(3),
	]);
}

export function hashEntry(entry: Entry): EntryHash {
	if (entry.entry_type === 'Agent') return entry.entry;
	return hash(entry, HashType.ENTRY);
}

export function isHash(hash: string): boolean {
	return !![
		AGENT_PREFIX,
		ENTRY_PREFIX,
		DHTOP_PREFIX,
		DNA_PREFIX,
		ACTION_PREFIX,
	].find(prefix => hash.startsWith(`u${prefix}`));
}

// The hash of an action depends on the order of keys
// To make it deterministic and aligned with hashes of actions coming from holochain
// we need to enforce the order of actions to align with the holochain ones
function sortActionKeys(action: Action): Action {
	const weight = (action as any).weight;
	switch (action.type) {
		case ActionType.Dna:
			return {
				type: ActionType.Dna,
				author: action.author,
				timestamp: action.timestamp,
				hash: action.hash,
			};
		case ActionType.AgentValidationPkg:
			return {
				type: ActionType.AgentValidationPkg,
				author: action.author,
				timestamp: action.timestamp,
				action_seq: action.action_seq,
				prev_action: action.prev_action,
				membrane_proof: action.membrane_proof,
			};
		case ActionType.InitZomesComplete:
			return {
				type: ActionType.InitZomesComplete,
				author: action.author,
				timestamp: action.timestamp,
				action_seq: action.action_seq,
				prev_action: action.prev_action,
			};
		case ActionType.CreateLink:
			return {
				type: ActionType.CreateLink,
				author: action.author,
				timestamp: action.timestamp,
				action_seq: action.action_seq,
				prev_action: action.prev_action,

				base_address: action.base_address,
				target_address: action.target_address,
				zome_index: action.zome_index,
				link_type: action.link_type,
				tag: action.tag,
				weight: {
					bucket_id: action.weight.bucket_id,
					units: action.weight.units,
				},
			};
		case ActionType.DeleteLink:
			return {
				type: ActionType.DeleteLink,
				author: action.author,
				timestamp: action.timestamp,
				action_seq: action.action_seq,
				prev_action: action.prev_action,
				base_address: action.base_address,
				link_add_address: action.link_add_address,
			};
		case ActionType.OpenChain:
			return {
				type: ActionType.OpenChain,
				author: action.author,
				timestamp: action.timestamp,
				action_seq: action.action_seq,
				prev_action: action.prev_action,
				prev_dna_hash: action.prev_dna_hash,
			};
		case ActionType.CloseChain:
			return {
				type: ActionType.CloseChain,
				author: action.author,
				timestamp: action.timestamp,
				action_seq: action.action_seq,
				prev_action: action.prev_action,
				new_dna_hash: action.new_dna_hash,
			};
		case ActionType.Create:
			return {
				type: ActionType.Create,
				author: action.author,
				timestamp: action.timestamp,
				action_seq: action.action_seq,
				prev_action: action.prev_action,
				entry_type: action.entry_type,
				entry_hash: action.entry_hash,
				weight: {
					bucket_id: weight.bucket_id,
					units: weight.units,
					rate_bytes: weight.rate_bytes,
				},
			} as any;
		case ActionType.Update:
			return {
				type: ActionType.Update,
				author: action.author,
				timestamp: action.timestamp,
				action_seq: action.action_seq,
				prev_action: action.prev_action,

				original_action_address: action.original_action_address,
				original_entry_address: action.original_entry_address,

				entry_type: action.entry_type,
				entry_hash: action.entry_hash,
				weight: {
					bucket_id: weight.bucket_id,
					units: weight.units,
					rate_bytes: weight.rate_bytes,
				},
			} as any;
		case ActionType.Delete:
			return {
				type: ActionType.Delete,
				author: action.author,
				timestamp: action.timestamp,
				action_seq: action.action_seq,
				prev_action: action.prev_action,

				deletes_address: action.deletes_address,
				deletes_entry_address: action.deletes_entry_address,
				weight: {
					bucket_id: weight.bucket_id,
					units: weight.units,
				},
			} as any;
	}
}

export function hashAction(action: Action): ActionHash {
	return hash(sortActionKeys(action), HashType.ACTION);
}

// From https://github.com/holochain/holochain/blob/dc0cb61d0603fa410ac5f024ed6ccfdfc29715b3/crates/holo_hash/src/encode.rs
export function hash(content: any, type: HashType): HoloHash {
	const bytesHash: Uint8Array = blake.blake2b(encode(content), null, 32);

	const fullhash = new Uint8Array([
		...Base64.toUint8Array(getPrefix(type)),
		...bytesHash,
		...locationBytes(bytesHash),
	]);

	return fullhash;
}

export function locationBytes(bytesHash: HoloHash): Uint8Array {
	const hash128: Uint8Array = blake.blake2b(bytesHash, null, 16);

	const out = [hash128[0], hash128[1], hash128[2], hash128[3]];

	for (let i = 4; i < 16; i += 4) {
		out[0] ^= hash128[i];
		out[1] ^= hash128[i + 1];
		out[2] ^= hash128[i + 2];
		out[3] ^= hash128[i + 3];
	}
	return new Uint8Array(out);
}

export function getHashType(hash: HoloHash): HashType {
	const hashExt = encodeHashToBase64(hash).slice(1, 5);

	if (hashExt === AGENT_PREFIX) return HashType.AGENT;
	if (hashExt === DNA_PREFIX) return HashType.DNA;
	if (hashExt === DHTOP_PREFIX) return HashType.DHTOP;
	if (hashExt === ACTION_PREFIX) return HashType.ACTION;
	if (hashExt === ENTRY_PREFIX) return HashType.ENTRY;

	return HashType.ENTRY;
}
