# @holochain-open-dev/signals

Re-export of [`signal-polyfill`](https://www.npmjs.com/package/signal-polyfill) and [`async-signals`](https://www.npmjs.com/package/async-signals), with some additional utilities targeted to build holochain apps on top of it.

These are the additional utilities added by this package:

### immutableEntrySignal

Fetches the given entry, retrying if there is a failure.

Makes requests only the first time it is watched, and will stop after it succeeds in fetching the entry.

Whenever it succeeds, it caches the value so that any subsequent requests are cached.

Useful for entries that can't be updated.

```ts
import { Link } from '@holochain/client';
import { LazyHoloHashMap, EntryRecord } from '@holochain-open-dev/utils';
import { AsyncSignal, immutableEntrySignal } from '@holochain-open-dev/signals';

import { PostsClient } from './posts-client.js';
import { Post } from './types.js';

export class PostsStore {

  constructor(public postsClient: PostsClient) {}

  posts: LazyHoloHashMap<ActionHash, EntryRecord<Post>> = new LazyHoloHashMap((postHash: ActionHash) => 
    immutableEntrySignal(() => this.postsClient.getPost(postHash))
  );
}
```

### latestVersionOfEntrySignal

Keeps an up to date copy of the latest version of an entry, making requests only while it has some watcher.

Will do so by calling the given every 20 seconds calling the given fetch function, and listening to `EntryUpdated` signals.

Useful for entries that can be updated.

```ts
import { Link } from '@holochain/client';
import { LazyHoloHashMap, EntryRecord } from '@holochain-open-dev/utils';
import { AsyncSignal, latestVersionOfEntrySignal } from '@holochain-open-dev/signals';

import { PostsClient } from './posts-client.js';
import { Post } from './types.js';

export class PostsStore {

  constructor(public postsClient: PostsClient) {}

  posts: LazyHoloHashMap<ActionHash, EntryRecord<Post>> = new LazyHoloHashMap((postHash: ActionHash) => 
    latestVersionOfEntrySignal(
      this.postsClient, // Give the client so that it can listen to the `EntryUpdated` signal
      () => this.postsClient.getLatestPost(postHash)), // Fetch the latest version of the post
  );
}
```

### allRevisionsOfEntrySignal

Keeps an up to date list of all the revisions for an entry, making requests only while it has some subscriber.

Will do so by calling the given every 20 seconds calling the given fetch function, and listening to `EntryUpdated` signals.

Useful for entries that can be updated.

```ts
import { Link } from '@holochain/client';
import { LazyHoloHashMap, EntryRecord } from '@holochain-open-dev/utils';
import { AsyncSignal, allRevisionsOfEntrySignal } from '@holochain-open-dev/signals';

import { PostsClient } from './posts-client.js';
import { Post } from './types.js';

export class PostsStore {

  constructor(public postsClient: PostsClient) {}

  posts: LazyHoloHashMap<ActionHash, Array<EntryRecord<Post>>> = new LazyHoloHashMap((postHash: ActionHash) => 
    allRevisionsOfEntrySignal(
      this.postsClient, // Give the client so that it can listen to the `EntryUpdated` signal
      () => this.postsClient.getAllRevisionsForPost(postHash)), // Fetch all the revisions for the post
  );
}
```

### deletesForEntrySignal

Keeps an up to date list of the deletes for an entry, making requests only while it has some subscriber.

Will do so by calling the given every 20 seconds calling the given fetch function, and listening to `EntryDeleted` signals.

Useful for entries that can be deleted.

```ts
import { Link } from '@holochain/client';
import { LazyHoloHashMap, EntryRecord } from '@holochain-open-dev/utils';
import { AsyncSignal, deletesForEntrySignal } from '@holochain-open-dev/signals';

import { PostsClient } from './posts-client.js';
import { Post } from './types.js';

export class PostsStore {

  constructor(public postsClient: PostsClient) {}

  posts: LazyHoloHashMap<ActionHash, Array<SignedActionHashed<Delete>>> = new LazyHoloHashMap((postHash: ActionHash) => 
    deletesForEntrySignal(
      this.postsClient, // Give the client so that it can listen to the `EntryDeleted` signal
      postHash, // Hash of the original `Create` action
      () => this.postsClient.getAllDeletesForPost(postHash)), // Fetch all the delete actions for the post
  );
}
```


### collectionSignal

Keeps an up to date list of the targets for the non-deleted links for the given collection in this DHT, making requests only while it has some subscriber.

Will do so by calling the given every 20 seconds calling the given fetch function, and listening to `LinkCreated` and `LinkDeleted` signals.

Useful for collections

```ts
import { Link } from '@holochain/client';
import { AsyncSignal, collectionSignal } from '@holochain-open-dev/signals';

import { PostsClient } from './posts-client.js';

export class PostsStore {

  constructor(public postsClient: PostsClient) {}

  allPostsSignal: AsyncSignal<Array<Link>> = collectionSignal(
    this.postsClient,
    async () => this.postsClient.getAllPosts(), // Request to fetch the initial list of posts
    "AllPosts", // Link type for the collection
  );
}
```

### liveLinksSignal

Keeps an up to date list of the links for the non-deleted links in this DHT, making requests only while it has some subscriber.

Will do so by calling the given fetch callback every 20 seconds, and listening to `LinkCreated` and `LinkDeleted` signals.

Useful for link types.

```ts
import { Link } from '@holochain/client';
import { AsyncSignal, collectionSignal } from '@holochain-open-dev/signals';

import { PostsClient } from './posts-client.js';

export class PostsStore {

  constructor(public postsClient: PostsClient) {}

  myPostsSignal: AsyncSignal<Array<Link>> = liveLinksSignal(
    this.postsClient,
    this.postsClient.client.myPubKey, // Base address for the links
    () => this.postsClient.getMyPosts(), // Fetch the live links
    'AuthorToPosts', // Link type
  );
}
```

### deletedLinksSignal

Keeps an up to date list of the targets for the deleted links in this DHT, making requests only while it has some subscriber.

Will do so by calling the given every 20 seconds calling the given fetch function, and listening to `LinkDeleted` signals.

Useful for link types and collections with some form of archive retrieving functionality

```ts
import { Link } from '@holochain/client';
import { AsyncSignal, collectionSignal } from '@holochain-open-dev/signals';

import { PostsClient } from './posts-client.js';

export class PostsStore {

  constructor(public postsClient: PostsClient) {}

  myDeletedPostsSignal: AsyncSignal<Array<[SignedActionHashed<CreateLink>, Array<SignedActionHashed<DeleteLink>>]>> = deletedLinksSignal(
    this.postsClient,
    this.postsClient.client.myPubKey, // Base address for the links
    () => this.postsClient.getMyDeletedPosts(), // Fetch the deleted links 
    'AuthorToPosts', // Link type
  );
}
```
