import {
  ActionHash,
  AgentPubKey,
  DnaHash,
  EntryHash,
  encodeHashToBase64,
  decodeHashFromBase64,
} from "@holochain/client";

export type Hrl = [DnaHash, ActionHash | EntryHash | AgentPubKey];

// Joins the given array to a string, serializing the hrls to the form "hrl://[DNAHASH]/[DHTHASH]"
export function joinHrlString(array: Array<string | Hrl>): string {
  return array.reduce((acc: string, next: string | Hrl) => {
    const nextn =
      typeof next === "string"
        ? next
        : `hrl://${encodeHashToBase64(next[0])}/${encodeHashToBase64(next[1])}`;
    return `${acc}${nextn}`;
  }, "") as string;
}

// Will match hrls inside strings of the style of "asd hrl://uhCAkHjbsLWchmJp7nOWH2wWlnfWz2yhtGYv4IS4MJXxrmydonqWy/uhCAkHjbsLWchmJp7nOWH2wWlnfWz2yhtGYv4IS4MJXxrmydonqWy"
const HRL_SEARCH_REGEX = /hrl:\/\/\w{53}\/\w{53}/gm;

// Splits the given string by the internal Hrls
export function splitHrlString(s: string): Array<string | Hrl> {
  let startIndex = 0;

  const array: Array<string | Hrl> = [];

  while (startIndex < s.length) {
    let hrlIndex = s.slice(startIndex).search(HRL_SEARCH_REGEX);
    if (hrlIndex === -1) {
      array.push(s.slice(startIndex));
      startIndex = s.length;
    } else {
      hrlIndex += startIndex;
      if (hrlIndex !== startIndex) {
        array.push(s.slice(startIndex, hrlIndex));
      }

      const dnaHash = decodeHashFromBase64(
        s.slice(hrlIndex + 6, hrlIndex + 6 + 53)
      );
      const entryHash = decodeHashFromBase64(
        s.slice(hrlIndex + 6 + 53 + 1, hrlIndex + 6 + 53 + 1 + 53)
      );
      array.push([dnaHash, entryHash]);
      startIndex = hrlIndex + 6 + 53 + 1 + 53;
    }
  }
  return array;
}
