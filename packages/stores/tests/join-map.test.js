import { expect } from "@esm-bundle/chai";
import { get, readable } from "svelte/store";
import { fromUint8Array, toUint8Array } from "js-base64";
import { asyncJoinMap, asyncReadable, joinMap } from "../dist-rollup";

const sleep = (ms) => new Promise((r) => setTimeout(() => r(), ms));

class LazyHoloHashMap extends Map {
  constructor(fn) {
    super();
    this.fn = fn;
  }
  get(hash) {
    const strHash = fromUint8Array(hash);
    if (!super.get(strHash)) {
      this.set(strHash, this.fn(hash));
    }
    return super.get(strHash);
  }

  entries() {
    return Array.from(super.entries())
      .map(([h, v]) => {
        return [toUint8Array(h), v];
      })
      [Symbol.iterator]();
  }
}

it("asyncJoinMap", async () => {
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

  const j = asyncJoinMap(lazyStoreMap);

  const subscriber = j.subscribe(() => {});

  expect(get(j)).to.deep.equal({ status: "pending" });
  await sleep(20);

  expect(Array.from(get(j).value.entries()).length).to.deep.equal(2);
});

it("joinMap", async () => {
  const lazyStoreMap = new LazyHoloHashMap((hash) => readable(0));

  const hashes = [new Uint8Array([0]), new Uint8Array([1])];

  for (const h of hashes) {
    lazyStoreMap.get(h);
  }

  const j = joinMap(lazyStoreMap);

  const subscriber = j.subscribe(() => {});

  expect(Array.from(get(j).values())).to.deep.equal([0, 0]);
});
