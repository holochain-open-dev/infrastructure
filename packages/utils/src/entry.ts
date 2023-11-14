import { Entry } from "@holochain/client";
import { encode } from "@msgpack/msgpack";

export function encodeAppEntry(appEntry: any): Entry {
  return {
    entry_type: "App",
    entry: encode(appEntry),
  };
}
