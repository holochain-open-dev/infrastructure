import { HoloHashMap } from '@holochain-open-dev/utils';
import { HoloHash } from '@holochain/client';
import { AsyncResult, JoinAsyncOptions, joinAsync } from 'async-signals';

/**
 * Joins all the results in a HoloHashMap of `AsyncResults`
 */
export function joinAsyncMap<K extends HoloHash, T>(
	map: ReadonlyMap<K, AsyncResult<T>>,
	joinOptions?: JoinAsyncOptions,
): AsyncResult<ReadonlyMap<K, T>> {
	const resultsArray = Array.from(map.entries()).map(([key, result]) => {
		if (result.status !== 'completed') return result;
		const value = [key, result.value] as [K, T];
		return {
			status: 'completed',
			value,
		} as AsyncResult<[K, T]>;
	});
	const arrayResult = joinAsync(resultsArray, joinOptions);

	if (arrayResult.status !== 'completed') return arrayResult;

	const value = new HoloHashMap<K, T>(arrayResult.value);
	return {
		status: 'completed',
		value,
	} as AsyncResult<ReadonlyMap<K, T>>;
}
