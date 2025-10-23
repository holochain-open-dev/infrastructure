import { HoloHashed, DnaDefinition } from '@holochain/client';

export interface DnaFile {
  dna: HoloHashed<DnaDefinition>;
  code: Array<WasmCode>;
}

export type WasmCode = [Uint8Array, { code: Array<number> }];
