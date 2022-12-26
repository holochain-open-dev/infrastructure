import { expect } from "@esm-bundle/chai";
import { get, readable } from "svelte/store";
import { lazyLoad, asyncDerived } from "../dist";

const sleep = (ms) => new Promise((r) => setTimeout(() => r(), ms));

it("lazyLoad", async () => {
  const asyncReadable = lazyLoad(async () => {
    await sleep(10);
    return "hi";
  });
  const subscriber = asyncReadable.subscribe(() => {});

  expect(get(asyncReadable)).to.deep.equal({ status: "pending" });
  await sleep(20);

  expect(get(asyncReadable)).to.deep.equal({ status: "complete", value: "hi" });
});

it("asyncDerived", async () => {
  const asyncReadable = lazyLoad(async () => {
    await sleep(10);
    return 1;
  });
  const r = readable(2);
  const d = asyncDerived([r, asyncReadable], ([n1, n2]) => n1 + n2);
  const subscriber = d.subscribe(() => {});

  expect(get(d)).to.deep.equal({ status: "pending" });
  await sleep(20);

  expect(get(d)).to.deep.equal({ status: "complete", value: 3 });
});
