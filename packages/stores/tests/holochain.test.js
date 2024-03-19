import {
  EntryRecord,
  fakeCreateAction,
  fakeCreateLinkAction,
  fakeDeleteEntry,
  fakeDeleteLinkAction,
  fakeEntry,
  fakeRecord,
  ZomeClient,
  ZomeMock,
} from "@holochain-open-dev/utils";
import {
  fakeActionHash,
  fakeAgentPubKey,
  fakeEntryHash,
} from "@holochain/client";
import { assert, test } from "vitest";
import {
  allRevisionsOfEntryStore,
  collectionStore,
  deletedLinksStore,
  deletesForEntryStore,
  immutableEntryStore,
  latestVersionOfEntryStore,
  liveLinksStore,
  toPromise,
} from "../src";

const sleep = (ms) => new Promise((r) => setTimeout(() => r(), ms));

async function fakeLink() {
  return {
    author: await fakeAgentPubKey(),
    create_link_hash: await fakeActionHash(),
    link_type: 0,
    tag: undefined,
    target: await fakeActionHash(),
    timestamp: Date.now() * 1000,
    zome_index: 0,
  };
}

test("liveLinks only updates once if no new links exist", async () => {
  const links = [await fakeLink()];
  const store = liveLinksStore(
    new ZomeClient(new ZomeMock("", "")),
    await fakeEntryHash(),
    async () => links,
    ""
  );

  let numUpdated = 0;
  let unsubs;

  await new Promise(async (resolve, reject) => {
    unsubs = store.subscribe((value) => {
      if (value.status === "complete") {
        numUpdated++;

        if (numUpdated > 1) reject("Multiple updates");
      }
    });

    await sleep(8000);
    resolve();
  });

  unsubs();
  links.push(await fakeLink());
  let numUpdated2 = 0;

  await new Promise(async (resolve, reject) => {
    store.subscribe((value) => {
      if (value.status === "complete") {
        numUpdated2++;
        // console.log(value.value);

        if (numUpdated2 > 1) reject("Multiple updates");
      } else if (value.status === "error") reject(value.error);
    });

    await sleep(8000);
    resolve();
  });
});

test("collection store works", async () => {
  const links = [await fakeLink()];
  const collection = collectionStore(
    new ZomeClient(new ZomeMock("", "")),
    async () => links,
    "",
    100
  );

  collection.subscribe(() => { });

  let collectionLinks = await toPromise(collection);

  assert.equal(collectionLinks.length, 1);

  links.push(await fakeLink());

  collectionLinks = await toPromise(collection);

  assert.equal(collectionLinks.length, 1);

  await sleep(110);

  collectionLinks = await toPromise(collection);

  assert.equal(collectionLinks.length, 2);
});

test("latestVersionOfEntry store works", async () => {
  let record = new EntryRecord(
    await fakeRecord(await fakeCreateAction(), fakeEntry({ some: "entry" }))
  );
  const firstRecord = record;
  const latestVersion = latestVersionOfEntryStore(
    new ZomeClient(new ZomeMock("", "")),
    async () => record,
    100
  );

  latestVersion.subscribe(() => { });

  let latestRecord = await toPromise(latestVersion);

  assert.deepEqual(latestRecord, record);

  record = new EntryRecord(
    await fakeRecord(
      await fakeCreateAction(),
      fakeEntry({ some: "other-entry" })
    )
  );

  latestRecord = await toPromise(latestVersion);

  assert.deepEqual(latestRecord, firstRecord);

  await sleep(110);

  latestRecord = await toPromise(latestVersion);

  assert.deepEqual(latestRecord, record);
});

test("allRevisionsOfEntryStore works", async () => {
  let record = await fakeRecord(
    await fakeCreateAction(),
    fakeEntry({ some: "entry" })
  );
  const allRevisions = [new EntryRecord(record)];
  const allRevisionsStore = allRevisionsOfEntryStore(
    new ZomeClient(new ZomeMock("", "")),
    async () => allRevisions,
    100
  );

  allRevisionsStore.subscribe(() => { });

  let latestAllRevisions = await toPromise(allRevisionsStore);

  assert.equal(latestAllRevisions.length, 1);

  allRevisions.push(
    new EntryRecord(
      await fakeRecord(
        await fakeCreateAction(),
        fakeEntry({ some: "other-entry" })
      )
    )
  );

  await sleep(110);

  latestAllRevisions = await toPromise(allRevisionsStore);

  assert.equal(latestAllRevisions.length, 2);
});

test("deletesForEntry works", async () => {
  const deletes = [(await fakeRecord(await fakeDeleteEntry())).signed_action];
  const deletesStore = deletesForEntryStore(
    new ZomeClient(new ZomeMock("", "")),
    await fakeActionHash(),
    async () => deletes,
    100
  );

  deletesStore.subscribe(() => { });

  let latestDeletes = await toPromise(deletesStore);

  assert.equal(latestDeletes.length, 1);

  deletes.push((await fakeRecord(await fakeDeleteEntry())).signed_action);

  await sleep(110);

  latestDeletes = await toPromise(deletesStore);

  assert.equal(latestDeletes.length, 2);
});

test("liveLinksStore works", async () => {
  const links = [await fakeLink()];
  const linksStore = liveLinksStore(
    new ZomeClient(new ZomeMock("", "")),
    await fakeActionHash(),
    async () => links,
    "",
    100
  );

  linksStore.subscribe(() => { });

  let latestLinks = await toPromise(linksStore);

  assert.equal(latestLinks.length, 1);

  links.push(await fakeLink());

  await sleep(110);

  latestLinks = await toPromise(linksStore);

  assert.equal(latestLinks.length, 2);
});

test("deleteLinksStore works", async () => {
  const deletedLinks = [
    [
      (await fakeRecord(await fakeCreateLinkAction())).signed_action,
      [(await fakeRecord(await fakeDeleteLinkAction())).signed_action],
    ],
  ];
  const deletedStore = deletedLinksStore(
    new ZomeClient(new ZomeMock("", "")),
    await fakeActionHash(),
    async () => deletedLinks,
    "",
    100
  );

  deletedStore.subscribe(() => { });

  let latestDeletedLinks = await toPromise(deletedStore);

  assert.equal(latestDeletedLinks.length, 1);

  deletedLinks.push([
    (await fakeRecord(await fakeCreateLinkAction())).signed_action,
    [(await fakeRecord(await fakeDeleteLinkAction())).signed_action],
  ]);

  await sleep(110);

  latestDeletedLinks = await toPromise(deletedStore);

  assert.equal(latestDeletedLinks.length, 2);
});

test("immutableEntryStore caches its results", async () => {
  let entry = fakeRecord(fakeCreateAction());
  let requests = 0;
  const store = immutableEntryStore(async () => {
    requests++;
    return entry;
  });

  let unsubs = store.subscribe(() => { });

  await sleep(10);

  unsubs();

  unsubs = store.subscribe(() => { });

  assert.equal(requests, 1);
});
