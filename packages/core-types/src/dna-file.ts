import { HoloHashed, DnaDefinition, WasmCode } from "@holochain/client";

export interface DnaFile {
  dna: HoloHashed<DnaDefinition>;
  code: Array<WasmCode>;
}
