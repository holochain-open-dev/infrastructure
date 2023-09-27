import { expect, it } from "vitest";
import {
  asyncReadable,
  toPromise,
  get,
  readable,
  lazyLoad,
  lazyLoadAndPoll,
} from "../src";

const sleep = (ms) => new Promise((r) => setTimeout(() => r(), ms));

it("to-promise", async () => {
  let unsubscribed = false;
  const asyncReadableStore = asyncReadable(async (set) => {
    await sleep(10);
    set("hi");
    return () => {
      unsubscribed = true;
    };
  });

  const result = await toPromise(asyncReadableStore);

  expect(unsubscribed).to.be.true;

  expect(result).to.equal("hi");
});

it("to-promise subscribes every time", async () => {
  let subscriberCount = 0;
  const asyncReadableStore = asyncReadable(async (set) => {
    await sleep(10);
    subscriberCount++;
    set("hi");
  });

  await toPromise(asyncReadableStore);
  await toPromise(asyncReadableStore);

  expect(subscriberCount).to.equal(2);
});

it("lazyLoad subscribes every time", async () => {
  let subscriberCount = 0;
  const store = lazyLoad(async () => {
    await sleep(10);
    subscriberCount++;
    return "hi";
  });

  await toPromise(store);
  await toPromise(store);

  expect(subscriberCount).to.equal(2);
});

it("lazyLoadAndPoll subscribes every time", async () => {
  let subscriberCount = 0;
  const store = lazyLoadAndPoll(async () => {
    await sleep(10);
    subscriberCount++;
    return "hi";
  }, 10);

  await toPromise(store);
  await toPromise(store);

  expect(subscriberCount).to.equal(2);
});
