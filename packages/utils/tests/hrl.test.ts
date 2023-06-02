import { test, assert } from "vitest";
import { joinHrlString, splitHrlString } from "../src/index.js";

test("test hrl", async () => {
  const s =
    "asdf hrl://uhC0klPO5uidBIXO4dN5lZFIz7alMe6VxDYYk2RMMiVa1ahM3Xhjr/uhCAkWXw-U9f4e6AQUrgIFTi0POajFLN1R1ZgthLyK_Uu6MB50hmE ";

  const a = splitHrlString(s);

  assert.equal(a.length, 3);
  assert.equal(joinHrlString(a), s);
});
