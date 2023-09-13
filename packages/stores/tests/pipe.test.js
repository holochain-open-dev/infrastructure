import { expect, it } from "vitest";
import { get, readable } from "svelte/store";
import { join, asyncReadable, pipe, lazyLoad } from "../src";

const sleep = (ms) => new Promise((r) => setTimeout(() => r(), ms));

it("pipe with normal fn", async () => {
  const asyncReadableStore = asyncReadable(async (set) => {
    await sleep(10);
    set("hi");
  });
  const pipeStore = pipe(asyncReadableStore, (s) => `${s}hi`);
  const subscriber = pipeStore.subscribe(() => {});

  expect(get(pipeStore)).to.deep.equal({ status: "pending" });
  await sleep(20);

  expect(get(pipeStore)).to.deep.equal({
    status: "complete",
    value: "hihi",
  });
});

it("pipe with promise", async () => {
  const asyncReadableStore = asyncReadable(async (set) => {
    await sleep(10);
    set("hi");
  });
  const pipeStore = pipe(asyncReadableStore, async (s) => {
    await sleep(5);
    return `${s}hi`;
  });
  const subscriber = pipeStore.subscribe(() => {});

  expect(get(pipeStore)).to.deep.equal({ status: "pending" });
  await sleep(20);

  expect(get(pipeStore)).to.deep.equal({
    status: "complete",
    value: "hihi",
  });
});

it("pipe with readable", async () => {
  const asyncReadableStore = asyncReadable(async (set) => {
    await sleep(10);
    set("hi");
  });
  const pipeStore = pipe(asyncReadableStore, (s) => readable(`${s}hi`));
  const subscriber = pipeStore.subscribe(() => {});

  expect(get(pipeStore)).to.deep.equal({ status: "pending" });
  await sleep(20);

  expect(get(pipeStore)).to.deep.equal({
    status: "complete",
    value: "hihi",
  });
});

it.only("pipe with asyncReadable", async () => {
  const asyncReadableStore = asyncReadable(async (set) => {
    await sleep(10);
    set("hi");
  });
  const pipeStore = pipe(asyncReadableStore, (s) =>
    lazyLoad(async () => {
      await sleep(1);
      return `${s}hi`;
    })
  );
  const subscriber = pipeStore.subscribe(() => {});

  expect(get(pipeStore)).to.deep.equal({ status: "pending" });
  await sleep(20);

  expect(get(pipeStore)).to.deep.equal({
    status: "complete",
    value: "hihi",
  });
});

it("pipe with all types", async () => {
  const asyncReadableStore = asyncReadable(async (set) => {
    await sleep(10);
    set("hi");
  });
  const pipeStore = pipe(
    asyncReadableStore,
    (s) =>
      lazyLoad(async () => {
        await sleep(1);
        return `${s}hi`;
      }),
    (s) => readable(`${s}hi`),
    async (s) => {
      await sleep(1);
      return `${s}hi`;
    },
    (s) => `${s}hi`
  );
  const subscriber = pipeStore.subscribe(() => {});

  expect(get(pipeStore)).to.deep.equal({ status: "pending" });
  await sleep(20);

  expect(get(pipeStore)).to.deep.equal({
    status: "complete",
    value: "hihihihihi",
  });
});
