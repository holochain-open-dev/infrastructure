import { HoloHash } from "@holochain/client";
import { deserializeHash } from "@holochain-open-dev/utils";
import { PropertyDeclaration } from "lit";

export function hashState() {
  return {
    hasChanged: (oldVal: HoloHash, newVal: HoloHash) => oldVal.toString() !== newVal.toString()
  }
}

export function hashProperty(attributeName: string): PropertyDeclaration<Object | null, unknown> {
  return {
    attribute: attributeName,
    type: Object,
    hasChanged: (oldVal: HoloHash | undefined, newVal: HoloHash | undefined) => oldVal?.toString() !== newVal?.toString(),
    converter: (s: string | undefined) => s && s.length > 0 && deserializeHash(s)
  }
}
