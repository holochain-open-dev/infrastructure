import { HoloHashMap } from '@holochain-open-dev/utils';
import { HoloHash } from '@holochain/client';
import { AsyncResult, JoinAsyncOptions, joinAsync } from 'async-signals';

type AsyncResultValue<T> = T extends AsyncResult<infer U> ? U : never;

/**
 * Joins all the results in a HoloHashMap of `AsyncSignals`
 */
export function joinAsyncMap<K extends HoloHash, V extends AsyncResult<any>>(
	map: ReadonlyMap<K, V>,
	joinOptions?: JoinAsyncOptions,
): AsyncResult<ReadonlyMap<K, AsyncResultValue<V>>> {
	const resultsArray = Array.from(map.entries()).map(([key, result]) => {
		if (result.status !== 'completed') return result;
		const value = [key, result.value] as [K, AsyncResultValue<V>];
		return {
			status: 'completed',
			value,
		} as AsyncResult<[K, AsyncResultValue<V>]>;
	});
	const arrayResult = joinAsync(resultsArray, joinOptions);

	if (arrayResult.status !== 'completed') return arrayResult;

	const value = new HoloHashMap<K, AsyncResultValue<V>>(arrayResult.value);
	return {
		status: 'completed',
		value,
	} as AsyncResult<ReadonlyMap<K, AsyncResultValue<V>>>;
}
