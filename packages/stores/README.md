# @holochain-open-dev/stores

Re-export of `svelte/store`, with some additional utilities on top of it.

Refer to the official [Svelte documentation](https://svelte.dev/tutorial/writable-stores) to learn how to use svelte stores.

These are the additional utilities added by this package:

## AsyncReadable<T>

An `AsyncReadable<T>` is a `Readable` store that integrates with `Promises`. It can have three states:

- `pending`: the promise is still pending.
- `error`: there was an error in the execution of the promise.
- `complete`: the promise was completed.

### lazyLoad()

`Readable` that will only execute the promise when the first subscriber subscribes.

```js
import { lazyLoad } from '@holochain-open-dev/stores';

const asyncReadable = lazyLoad(async () => fetch("https://some/url"));

// Use as a normal svelte store
asyncReadable.subscribe(status => { console.log(status); });
```

### lazyLoadAndPoll

`Readable` that will execute the promise when the first subscriber subscribes, and will re-execute it in a polling fashion as long as there is some subscriber.

```js
import { lazyLoadAndPoll } from '@holochain-open-dev/stores';

const asyncReadable = lazyLoadAndPoll(async () => fetch("https://some/url"), 5000);

// Use as a normal svelte store
asyncReadable.subscribe(status => { console.log(status); });
```

### lazyLoadAndListen

`Readable` that will execute the promise when the first subscriber subscribes, and will listen for updates.

This is useful when there is a backend to frontend message that needs to be reacted to in the store.

```js
import { lazyLoadAndListen } from '@holochain-open-dev/stores';

const websocket = new WebSocket('https://some/ws/url'); 

const asyncReadable = lazyLoadAndListen(
  async () => fetch("https://someorigin/fetch/posts"), 
  (update) => websocket.on('newPost', post => update(posts => posts.push(post)))
);

// Use as a normal svelte store
asyncReadable.subscribe(status => { console.log(status); });
```

## asyncDerived

Takes an array of `Readable`s or `AsyncReadable`s and returns an `AsyncReadable` by deriving only when the state of all the given stores is completed. This is the complete behaviour:

- If any of the given `AsyncReadable` has an error, then return the error.
- If any of the given `AsyncReadable` is still pending, then return `{ status: 'pending' }`.
- If all of the given `AsyncReadable` have completed, then execute the given function with the completed values.

Example:

```js
import { asyncDerived } from '@holochain-open-dev/stores';

const asyncReadable1 = lazyLoad(async () => fetch("https://some/url"));
const asyncReadable2 = lazyLoad(async () => fetch("https://some/url2"));

const composedResult = asyncDerived([asyncReadable1, asyncReadable2], ([result1, result2]) => `Result 1: ${result1}, result 2: ${result2}`);
```