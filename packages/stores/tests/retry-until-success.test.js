import { test, assert } from "vitest";
import { get } from "svelte/store";
import { retryUntilSuccess } from "../src";

const sleep = (ms) => new Promise((r) => setTimeout(() => r(), ms));

test("retryUntilSuccess", async () => {
  let tryCount = 0;

  const s = retryUntilSuccess(() => {
    if (tryCount === 3) return true;
    tryCount += 1;
    throw new Error("My Error");
  }, 10);

  s.subscribe(() => {});

  assert.equal(get(s).status, "pending");
  await sleep(60);

  assert.equal(get(s).status, "complete");
});

test("retryUntilSuccess gives up", async () => {
  let tryCount = 0;

  const s = retryUntilSuccess(
    () => {
      if (tryCount === 3) return true;
      tryCount += 1;
      throw new Error("My Error");
    },
    10,
    2
  );

  s.subscribe(() => {});

  assert.equal(get(s).status, "pending");
  await sleep(60);

  assert.equal(get(s).status, "error");
});
