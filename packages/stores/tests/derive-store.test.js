import { expect } from "@esm-bundle/chai";
import { get, readable } from "svelte/store";
import { deriveStore } from "../dist";

it("deriveStore", async () => {
  const readableStore1 = readable(1);
  const readableStore2 = readable(2);
  const s = deriveStore([readableStore1], () => readableStore2);

  expect(get(s)).to.deep.equal(2);
});
