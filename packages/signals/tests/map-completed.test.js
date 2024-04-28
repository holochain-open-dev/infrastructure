import { expect, it } from "vitest";
import { fromPromise } from "async-signals";

import { mapCompleted, watch } from "../src";

const sleep = (ms) => new Promise((r) => setTimeout(() => r(), ms));

it("mapCompleted", async () => {
  const signal = fromPromise(async () => {
    await sleep(10);
    return 1;
  });
  const signal2 = mapCompleted(signal, (n) => n + 1);

  watch(signal2, () => {});

  expect(signal2.get().status).to.be.equal("pending");

  await sleep(20);

  expect(signal2.get().status).to.be.equal("completed");
  expect(signal2.get().value).to.be.equal(2);
});
