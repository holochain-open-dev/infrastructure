import { expect } from "@esm-bundle/chai";
import { get, readable } from "svelte/store";
import { joinMap, asyncReadable } from "../dist-rollup";

const sleep = (ms) => new Promise((r) => setTimeout(() => r(), ms));

class LazyHoloHashMap {
  constructor(fn) {
    this.fn = fn;
    this.values = {};
  }
  get(hash) {
    if (!this.values[hash.toString()]) {
      this.values[hash.toString()] = this.fn(hash);
    }
    return this.values[hash.toString()];
  }
  entries() {
    return Object.entries(this.values);
  }
}

it("joinMap", async () => {
  const lazyStoreMap = new LazyHoloHashMap((hash) =>
    asyncReadable(async (set) => {
      await sleep(10);
      set(hash);
    })
  );

  const hashes = [new Uint8Array([0]), new Uint8Array([1])];

  for (const h of hashes) {
    lazyStoreMap.get(h);
  }

  const j = joinMap(lazyStoreMap);

  const subscriber = j.subscribe(() => {});

  expect(get(j)).to.deep.equal({ status: "pending" });
  await sleep(20);

  expect(get(j).value.entries().length).to.deep.equal(2);
});
