import { test, assert } from "vitest";
import { get, manualReloadStore } from "../src";

test("manual reload", async () => {
  const store = manualReloadStore(async () => 1);

  store.subscribe(() => {});

  await store.reload();

  assert.equal(get(store).value, 1);
});
