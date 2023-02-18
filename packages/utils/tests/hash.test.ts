import { encodeHashToBase64 } from "@holochain/client";
import { test, assert } from "vitest";
import { hash, HashType } from "../src/index.js";

test("test hash", async () => {
  const h = hash("asdfsadf", HashType.ACTION);
  assert.equal(
    encodeHashToBase64(h),
    "uhCkkboYJIWR7sh8l4i7OTWdOm3iY9ikij1-D9JLoqar86YF4KNht"
  );
});

test("test ordering", async () => {
  assert.deepEqual(
    hash({ first: 1, second: 2 }, HashType.ACTION),
    hash({ second: 2, first: 1 }, HashType.ACTION)
  );
});
