import { HoloHashed } from '@holochain/client';

export interface DnaFile {
  dna: HoloHashed<DnaDef>;
  code: Array<WasmCode>;
}

export interface DnaDef {
  name: string;
  network_seed: string;
  properties: Uint8Array;
  zomes: Zomes;
}

export type Zomes = Array<[string, { wasm_hash: Array<Uint8Array> }]>;
export type WasmCode = [Uint8Array, { code: Array<number> }];
