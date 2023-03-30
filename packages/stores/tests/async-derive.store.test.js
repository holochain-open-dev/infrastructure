import { expect } from "@esm-bundle/chai";
import { get, readable } from "svelte/store";
import { asyncReadable, lazyLoad, asyncDeriveStore } from "../dist-rollup";

const sleep = (ms) => new Promise((r) => setTimeout(() => r(), ms));

it("asyncDeriveStore", async () => {
  const asyncReadableStore1 = asyncReadable(async (set) => {
    await sleep(10);
    set(1);
  });
  const asyncReadableStore2 = asyncReadable(async (set) => {
    await sleep(10);
    set(2);
  });
  const d = asyncDeriveStore(
    asyncReadableStore1,
    async () => asyncReadableStore2
  );
  const subscriber = d.subscribe(() => {});

  expect(get(d)).to.deep.equal({ status: "pending" });
  await sleep(20);

  expect(get(d)).to.deep.equal({
    status: "complete",
    value: 2,
  });
});

it("asyncDeriveStore does not unsubscribe", async () => {
  const asyncReadableStore1 = asyncReadable(async (set) => {
    await sleep(10);
    set(1);
  });
  const e = asyncDeriveStore(asyncReadableStore1, (r1) => {
    return lazyLoad(async () => r1 + 1);
  });
  const d = asyncDeriveStore(e, (r1) => lazyLoad(async () => r1 + 1));
  const subscriber = d.subscribe((va) => {});

  await sleep(20);
  expect(get(e)).to.deep.equal({ status: "complete", value: 2 });
  expect(get(d)).to.deep.equal({ status: "complete", value: 3 });
});
