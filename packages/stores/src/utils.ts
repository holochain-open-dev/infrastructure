import { Readable } from 'svelte/store';

export function withLogger<S>(s: Readable<S>, name: string): Readable<S> {
	return {
		subscribe: callFn => {
			console.log('subscribed to ', name);
			const unsubs = s.subscribe(value => {
				console.log('new value for ', name, ': ', value);
				callFn(value)
			});

			return () => {
				console.log('unsubscribed to ', name)

				return unsubs()
			}
		}
	}
}

