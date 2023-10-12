import { encodeHashToBase64 } from "@holochain/client";
import { test, assert } from "vitest";
import { cleanNodeDecoding } from "../src/clean-node-decoding.js";

test("test clean", async () => {
  const hi = {
    hi: null,
    bu: Buffer.from(new Uint8Array([1, 1, 1])),
  };
  assert.deepEqual(cleanNodeDecoding(hi), {
    hi: undefined,
    bu: new Uint8Array([1, 1, 1]),
  });
});
