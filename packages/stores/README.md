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

### lazyLoad

Constructs an `AsyncReadable<T>` with the result of a promise, which it will execute only when the first subscriber subscribes.

```ts
import { lazyLoad } from '@holochain-open-dev/stores';

const someResult = lazyLoad(async () => fetch("https://some/url"));

// Use someResult as any other `AsyncReadable<T>`
```

### lazyLoadAndPoll

Really similar to `lazyLoad`, but adds polling with the given poll interval to the promise.

The value of the store will be replaced with the polling result, only if the polling is successful. If the polling throws an error, that error is discarded.

```ts
import { lazyLoadAndPoll } from '@holochain-open-dev/stores';

const someResult = lazyLoadAndPoll(async () => fetch("https://some/url"), 1000); // Poll every one second

// Use someResult as any other `AsyncReadable<T>`
```

## asyncDerived

Derives an `AsyncReadable` only when the state of the given store is completed.

Example:

```js
import { asyncDerived, asyncReadable } from '@holochain-open-dev/stores';

const asyncReadable = asyncReadable(async set => set(await fetch("https://some/url")));

const composedResult = asyncDerived(asyncReadable, async (result) => fetch(`https://some/other/dependant/${result}`));
```

## deriveStore

Sometimes it's not enough to derive a value from an existing store. Sometimes you want to derive _another store_ from the value of the given store.

Imagine a nested store:

```ts
import { writable } from '@holochain-open-dev/stores';
const globalStore = writable({
  featureStore: writable(1)
});
```

How can I "unnest" `featureStore` from `globalStore`? With `deriveStore`!

It works just like `derived`, but expects the function to return a `Readable` store.

```ts
import { writable, deriveStore } from '@holochain-open-dev/stores';
const globalStore = writable({
  featureStore: writable(1)
});

const unnestedStore = deriveStore(globalStore, v => v.featureStore);

console.log(get(unnestedStore)) // Prints "1"
```

## asyncDeriveStore

Works exactly as `deriveStore`, but receives an `AsyncReadable` instead of just a `Readable`.

```ts
import { LazyHoloHashMap } from '@holochain-open-dev/utils';
import { asyncDeriveStore, asyncReadable } from '@holochain-open-dev/stores';

// Imagine we create an `AsyncReadable` store that gets my public key whenever it is subscribed to for the first time
const myPubKey = lazyLoad(() => callZome('get_my_pub_key'));

// And we have a `HoloHashMap` of `AsyncReadable`s that fetch the profile for each public key
const agentsProfiles = new LazyHoloHashMap((agent: AgentPubKey) => callZome('get_profile', agent));

// And then we want to combine both stores: get the profile for my public key
const myProfile = asyncDeriveStore(myPubKey, pubKey => agentsProfiles.get(pubKey));
```

## join

Joins a list of `AsyncReadable`s to convert it into a single `AsyncReadable` of a list of the resolved values.

```ts
import { join, asyncReadable } from '@holochain-open-dev/stores';

const asyncReadable1 = asyncReadable(async set => set(1));
const asyncReadable2 = asyncReadable(async set => set(2));

const joinedStores = join([asyncReadable1, asyncReadable2]);
console.log(joinedStores); // Will print `{ status: 'complete', value: [1, 2] }`
```

## joinMap

Exactly like `join` but for `HoloHashMap`s.

Converts a map of `AsyncReadable`s into an `AsyncReadable` of a map of the resolved values.

```ts
import { HoloHashMap, fakeEntryHash, fakeActionHash } from '@holochain-open-dev/utils';
import { joinMap } from '@holochain-open-dev/stores';

const map = new HoloHashMap();

map.put(fakeActionHash(), asyncReadable(async set => set(1)));
map.put(fakeEntryHash(), asyncReadable(async set => set(1)));

const mapStore = joinMap(map);
console.log(mapStore); // Will print `{ status: 'complete', value: <HoloHashMap with these values: { [fakeActionHash()]: 1, [fakeEntryHash()]: 2] }> }`
```
