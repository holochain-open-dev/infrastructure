import {
	ActionType,
	decodeHashFromBase64,
	encodeHashToBase64,
	fakeAgentPubKey,
	fakeDnaHash,
} from '@holochain/client';
import { assert, test } from 'vitest';

import {
	HashType,
	fakeCreateAction,
	fakeDeleteLinkAction,
	hash,
	hashAction,
} from '../src/index.js';

test('test hash', async () => {
	const h = hash('asdfsadf', HashType.ENTRY);
	assert.equal(
		encodeHashToBase64(h),
		'uhCEkboYJIWR7sh8l4i7OTWdOm3iY9ikij1-D9JLoqar86YF4KNht',
	);
});

test('test action hash', async () => {
	const h = hashAction({
		type: ActionType.Dna,
		timestamp: 1728551987340000,
		hash: decodeHashFromBase64(
			'uhC0kxfhaMcQ5m73u42s3tiWXWOeS2mTy7Ovj8oHn0Bilvmndtzun',
		),
		author: decodeHashFromBase64(
			'uhCAky816aQkHDHniTt-F0ccT0bAZFz6wUAq5jL7H1q8Ii8h62MG8',
		),
	});
	assert.equal(
		encodeHashToBase64(h),
		'uhCkkABYPHZNDn-U4AVhuev41b54I4xCPuLMOD-eLxy8lRNT9Fd7f',
	);
});

// test("test ordering", async () => {
//   assert.deepEqual(
//     hash({ first: 1, second: 2 }, HashType.ACTION),
//     hash({ second: 2, first: 1 }, HashType.ACTION)
//   );
// });
