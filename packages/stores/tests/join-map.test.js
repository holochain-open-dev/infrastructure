import { expect } from "@esm-bundle/chai";
import { get, readable } from "svelte/store";
import { fakeActionHash, fakeEntryHash } from "@holochain/client";
import { joinMap, asyncReadable } from "../dist";

const sleep = (ms) => new Promise((r) => setTimeout(() => r(), ms));

it("joinMap", async () => {
  const lazyStoreMap = new LazyHoloHashMap((hash) =>
    asyncReadable(async (set) => {
      await sleep(10);
      set(hash);
    })
  );

  const hashes = [fakeEntryHash(), fakeActionHash()];

  for (const h of hashes) {
    lazyStoreMap.get(h);
  }

  const j = joinMap(lazyStoreMap);

  const subscriber = j.subscribe(() => {});

  expect(get(j)).to.deep.equal({ status: "pending" });
  await sleep(20);

  expect(get(j).value.entries().length).to.deep.equal(2);
});
