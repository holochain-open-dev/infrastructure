import { ZomeMock } from "@holochain-open-dev/utils";
import {
  fakeActionHash,
  fakeAgentPubKey,
  fakeEntryHash,
  Link,
} from "@holochain/client";
import { test, assert } from "vitest";
import { get, liveLinksStore, manualReloadStore } from "../src";

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
    new ZomeMock("", ""),
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
        console.log("hey", value.value);

        if (numUpdated2 > 1) reject("Multiple updates");
      }
    });

    await sleep(8000);
    resolve();
  });
});
