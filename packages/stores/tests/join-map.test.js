import { expect, it } from "vitest";
import { get, readable } from "svelte/store";
import { fromUint8Array, toUint8Array } from "js-base64";
import { joinAsyncMap, asyncReadable, joinMap, mapAndJoin } from "../src";
import { HoloHashMap } from "@holochain-open-dev/utils";

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

  const j = joinAsyncMap(lazyStoreMap);

  const subscriber = j.subscribe(() => {});

  expect(get(j)).to.deep.equal({ status: "pending" });
  await sleep(20);

  expect(Array.from(get(j).value.entries()).length).to.deep.equal(2);
});

it("asyncJoinMap with error filtering", async () => {
  let first = true;
  const lazyStoreMap = new LazyHoloHashMap((hash) =>
    asyncReadable(async (set) => {
      await sleep(10);
      if (first) {
        first = false;
        throw new Error("hi");
      }
      set(2);
    })
  );

  const hashes = [new Uint8Array([0]), new Uint8Array([1])];

  for (const h of hashes) {
    lazyStoreMap.get(h);
  }

  const j = joinAsyncMap(lazyStoreMap, {
    errors: "filter_out",
  });

  const subscriber = j.subscribe(() => {});

  expect(get(j)).to.deep.equal({ status: "pending" });
  await sleep(20);

  expect(get(j).status).to.equal("complete");
  expect(Array.from(get(j).value.entries()).length).to.deep.equal(1);
});

it("mapAndJoin", async () => {
  const lazyStoreMap = new LazyHoloHashMap((hash) =>
    asyncReadable(async (set) => {
      await sleep(10);
      set(hash);
    })
  );

  const hashes = [new Uint8Array([0]), new Uint8Array([1])];

  const map = new HoloHashMap();
  map.set(hashes[0], "0");
  map.set(hashes[1], "1");

  const j = mapAndJoin(map, (h) => lazyStoreMap.get(h));

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
