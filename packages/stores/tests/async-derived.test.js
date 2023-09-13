import { expect, it } from "vitest";
import { get, readable } from "svelte/store";
import {
  joinAsync,
  asyncReadable,
  asyncDerived,
  lazyLoadAndPoll,
  lazyLoad,
  completed,
} from "../src";

const sleep = (ms) => new Promise((r) => setTimeout(() => r(), ms));

it("asyncReadable", async () => {
  const asyncReadableStore = asyncReadable(async (set) => {
    await sleep(10);
    set("hi");
  });
  const subscriber = asyncReadableStore.subscribe(() => {});

  expect(get(asyncReadableStore)).to.deep.equal({ status: "pending" });
  await sleep(20);

  expect(get(asyncReadableStore)).to.deep.equal({
    status: "complete",
    value: "hi",
  });
});

it("asyncDerived join", async () => {
  const asyncReadableStore = lazyLoad(async () => {
    await sleep(10);
    return 1;
  });
  const r = completed(2);
  const s = joinAsync([r, asyncReadableStore]);
  const d = asyncDerived(s, ([n1, n2]) => n1 + n2);
  const subscriber = d.subscribe(() => {});

  expect(get(d)).to.deep.equal({ status: "pending" });
  await sleep(20);

  expect(get(d)).to.deep.equal({ status: "complete", value: 3 });
});

it("asyncDerived with promise", async () => {
  const asyncReadableStore = asyncReadable(async (set) => {
    await sleep(10);
    set(1);
  });
  const r = completed(2);
  const d = asyncDerived(
    joinAsync([r, asyncReadableStore]),
    async ([n1, n2]) => {
      await sleep(20);
      return n1 + n2;
    }
  );
  const subscriber = d.subscribe(() => {});

  expect(get(d)).to.deep.equal({ status: "pending" });
  await sleep(40);

  expect(get(d)).to.deep.equal({ status: "complete", value: 3 });
});

it("lazyLoadAndPoll with undefined", async () => {
  const store = lazyLoadAndPoll(async () => {
    await sleep(10);
    return undefined;
  });
  const subscriber = store.subscribe(() => {});

  expect(get(store)).to.deep.equal({ status: "pending" });
  await sleep(20);

  expect(get(store)).to.deep.equal({
    status: "complete",
    value: undefined,
  });
});
