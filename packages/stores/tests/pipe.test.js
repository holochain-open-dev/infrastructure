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

it("pipe with normal fn that returns undefined", async () => {
  const asyncReadableStore = asyncReadable(async (set) => {
    await sleep(10);
    set("hi");
  });
  const pipeStore = pipe(asyncReadableStore, (s) => undefined);
  const subscriber = pipeStore.subscribe(() => {});

  expect(get(pipeStore)).to.deep.equal({ status: "pending" });
  await sleep(20);

  expect(get(pipeStore)).to.deep.equal({
    status: "complete",
    value: undefined,
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
  await sleep(30);

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

it("pipe with asyncReadable", async () => {
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

it("pipe yield the results for every step", async () => {
  const asyncReadableStore = lazyLoad(async () => {
    await sleep(10);
    return 1;
  });
  const pipeStore = pipe(
    asyncReadableStore,
    (s1) => s1 + 1,
    (s2, s1) => {
      expect(s1).to.equal(1);
      expect(s2).to.equal(2);
      return s1 + s2;
    },
    (s3, s2, s1) => {
      expect(s1).to.equal(1);
      expect(s2).to.equal(2);
      expect(s3).to.equal(3);
      return s1 + s2 + s3;
    },
    (s4, s3, s2, s1) => {
      expect(s1).to.equal(1);
      expect(s2).to.equal(2);
      expect(s3).to.equal(3);
      expect(s4).to.equal(6);
      return s1 + s2 + s3 + s4;
    },
    (s5, s4, s3, s2, s1) => {
      expect(s1).to.equal(1);
      expect(s2).to.equal(2);
      expect(s3).to.equal(3);
      expect(s4).to.equal(6);
      expect(s5).to.equal(12);
      return s1 + s2 + s3 + s4 + s5;
    },
    (s6, s5, s4, s3, s2, s1) => {
      expect(s1).to.equal(1);
      expect(s2).to.equal(2);
      expect(s3).to.equal(3);
      expect(s4).to.equal(6);
      expect(s5).to.equal(12);
      expect(s6).to.equal(24);
      return s1 + s2 + s3 + s4 + s5 + s6;
    }
  );
  const subscriber = pipeStore.subscribe(() => {});

  expect(get(pipeStore)).to.deep.equal({ status: "pending" });
  await sleep(30);

  expect(get(pipeStore)).to.deep.equal({
    status: "complete",
    value: 48,
  });
});
