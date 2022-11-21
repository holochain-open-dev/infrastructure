import { Timestamp } from "@holochain/client";

export function millisToTimestamp(millis: number): Timestamp {
  return millis * 1000;
}

export function timestampToMillis(timestamp: Timestamp): number {
  return Math.floor(timestamp / 1000);
}
