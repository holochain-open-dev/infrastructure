# @holochain-open-dev/stores

Re-export of `svelte/store`, with some additional utilities on top of it.

Refer to the official [Svelte documentation](https://svelte.dev/tutorial/writable-stores) to learn how to use svelte stores.

These are the additional utilities added by this package:

## AsyncReadable<T>

An `AsyncReadable<T>` is a `Readable` store that executes the given `Promise` the first time a subscriber subscribes to the store. It can have three states:

- `pending`: the promise is still pending.
- `error`: there was an error in the execution of the promise.
- `complete`: the promise was completed.

```js
import { asyncReadable } from '@holochain-open-dev/stores';

const someResult = asyncReadable(async set => {
  const value = await fetch("https://some/url");
  set(value);
});

// Use as a normal svelte store
someResult.subscribe(status => { console.log(status); }); // Will first print `{ status: 'pending' }`, and later print `{ status: 'complete', value: ... }`
```

Like normal `readable` stores, it returns an unsubscribe function that gets called when the last subscriber unsubscribes:


```js
import { asyncReadable } from '@holochain-open-dev/stores';

const someResult = asyncReadable(async set => {
  const value = await fetch("https://some/url");
  set(value);

  const pollInterval = setInterval(() => {
    const value = await fetch("https://some/url");
    set(value);
  });

  return () => clearInterval(pollInterval); // Will get executed when the last subscriber unsubscribes
});
```

## asyncDerived

Takes an array of `Readable`s or `AsyncReadable`s and returns an `AsyncReadable` by deriving only when the state of all the given stores is completed. This is the complete behaviour:

- If any of the given `AsyncReadable` has an error, then return the error.
- If any of the given `AsyncReadable` is still pending, then return `{ status: 'pending' }`.
- If all of the given `AsyncReadable` have completed, then execute the given function with the completed values.

Example:

```js
import { asyncDerived, asyncReadable } from '@holochain-open-dev/stores';

const asyncReadable1 = asyncReadable(async set => set(await fetch("https://some/url")));
const asyncReadable2 = asyncReadable(async set => set(await fetch("https://some/url2")));

const composedResult = asyncDerived([asyncReadable1, asyncReadable2], ([result1, result2]) => `Result 1: ${result1}, result 2: ${result2}`);
```