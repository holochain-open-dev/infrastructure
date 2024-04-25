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
import { Signal } from "signal-polyfill";
import { assert, test } from "vitest";
import {
  allRevisionsOfEntrySignal,
  collectionSignal,
  deletedLinksSignal,
  deletesForEntrySignal,
  immutableEntrySignal,
  latestVersionOfEntrySignal,
  liveLinksSignal,
  toPromise,
  watch,
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
  const signal = liveLinksSignal(
    new ZomeClient(new ZomeMock("", "")),
    await fakeEntryHash(),
    async () => links,
    "",
    100
  );

  let numUpdated = 0;
  let unsubs;

  await new Promise(async (resolve, reject) => {
    unsubs = watch(signal, (value) => {
      if (value.status === "complete") {
        numUpdated++;

        if (numUpdated > 1) reject("Multiple updates");
      }
    });

    await sleep(150);
    resolve();
  });

  unsubs();
  links.push(await fakeLink());
  let numUpdated2 = 0;

  await new Promise(async (resolve, reject) => {
    unsubs = watch(signal, (value) => {
      if (value.status === "complete") {
        numUpdated2++;
        // console.log(value.value);

        if (numUpdated2 > 1) reject("Multiple updates");
      } else if (value.status === "error") reject(value.error);
    });

    await sleep(150);
    resolve();
  });
  unsubs();
});

test("liveLinks makes the request again after being unsubscribed from", async () => {
  const links = [await fakeLink()];
  let requests = 0;
  const signal = liveLinksSignal(
    new ZomeClient(new ZomeMock("", "")),
    await fakeEntryHash(),
    async () => {
      requests += 1;
      return links;
    },
    ""
  );

  await toPromise(signal);
  await toPromise(signal);
  await toPromise(signal);
  await toPromise(signal);

  assert.equal(requests, 4);
});

test("collection signal works", async () => {
  const links = [await fakeLink()];
  const collection = collectionSignal(
    new ZomeClient(new ZomeMock("", "")),
    async () => links,
    "",
    100
  );

  watch(collection, () => {});

  let collectionLinks = await toPromise(collection);

  assert.equal(collectionLinks.length, 1);

  links.push(await fakeLink());

  collectionLinks = await toPromise(collection);

  assert.equal(collectionLinks.length, 1);

  await sleep(110);

  collectionLinks = await toPromise(collection);

  assert.equal(collectionLinks.length, 2);
});

test("latestVersionOfEntry signal works", async () => {
  let record = new EntryRecord(
    await fakeRecord(await fakeCreateAction(), fakeEntry({ some: "entry" }))
  );
  const firstRecord = record;
  const latestVersion = latestVersionOfEntrySignal(
    new ZomeClient(new ZomeMock("", "")),
    async () => record,
    100
  );

  watch(latestVersion, () => {});

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

test("allRevisionsOfEntrySignal works", async () => {
  let record = await fakeRecord(
    await fakeCreateAction(),
    fakeEntry({ some: "entry" })
  );
  const allRevisions = [new EntryRecord(record)];
  const allRevisionsSignal = allRevisionsOfEntrySignal(
    new ZomeClient(new ZomeMock("", "")),
    async () => allRevisions,
    100
  );

  watch(allRevisionsSignal, () => {});

  let latestAllRevisions = await toPromise(allRevisionsSignal);

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

  latestAllRevisions = await toPromise(allRevisionsSignal);

  assert.equal(latestAllRevisions.length, 2);
});

test("deletesForEntry works", async () => {
  const deletes = [(await fakeRecord(await fakeDeleteEntry())).signed_action];
  const deletesSignal = deletesForEntrySignal(
    new ZomeClient(new ZomeMock("", "")),
    await fakeActionHash(),
    async () => deletes,
    100
  );

  watch(deletesSignal, () => {});

  let latestDeletes = await toPromise(deletesSignal);

  assert.equal(latestDeletes.length, 1);

  deletes.push((await fakeRecord(await fakeDeleteEntry())).signed_action);

  await sleep(110);

  latestDeletes = await toPromise(deletesSignal);

  assert.equal(latestDeletes.length, 2);
});

test("liveLinksSignal works", async () => {
  const links = [await fakeLink()];
  const linksSignal = liveLinksSignal(
    new ZomeClient(new ZomeMock("", "")),
    await fakeActionHash(),
    async () => links,
    "",
    100
  );

  watch(linksSignal, () => {});

  let latestLinks = await toPromise(linksSignal);

  assert.equal(latestLinks.length, 1);

  links.push(await fakeLink());

  await sleep(110);

  latestLinks = await toPromise(linksSignal);

  assert.equal(latestLinks.length, 2);
});

test("deleteLinksSignal works", async () => {
  const deletedLinks = [
    [
      (await fakeRecord(await fakeCreateLinkAction())).signed_action,
      [(await fakeRecord(await fakeDeleteLinkAction())).signed_action],
    ],
  ];
  const deletedSignal = deletedLinksSignal(
    new ZomeClient(new ZomeMock("", "")),
    await fakeActionHash(),
    async () => deletedLinks,
    "",
    100
  );

  watch(deletedSignal, () => {});

  let latestDeletedLinks = await toPromise(deletedSignal);

  assert.equal(latestDeletedLinks.length, 1);

  deletedLinks.push([
    (await fakeRecord(await fakeCreateLinkAction())).signed_action,
    [(await fakeRecord(await fakeDeleteLinkAction())).signed_action],
  ]);

  await sleep(110);

  latestDeletedLinks = await toPromise(deletedSignal);

  assert.equal(latestDeletedLinks.length, 2);
});

test("immutableEntrySignal caches its results", async () => {
  let entry = fakeRecord(fakeCreateAction());
  let requests = 0;
  const signal = immutableEntrySignal(async () => {
    requests++;
    return entry;
  });

  let unsubs = watch(signal, () => {});

  await sleep(10);

  unsubs();

  unsubs = watch(signal, () => {});

  assert.equal(requests, 1);
});
