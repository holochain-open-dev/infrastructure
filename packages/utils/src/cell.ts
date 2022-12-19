import {
  CellId,
} from "@holochain/client";
import isEqual from "lodash-es/isEqual";

export function areCellIdsEqual(cellId1: CellId, cellId2: CellId): boolean {
  return isEqual(cellId1[0], cellId2[0]) && isEqual(cellId1[1], cellId2[1]);
}
