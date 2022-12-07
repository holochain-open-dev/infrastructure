import {
  AppInfoResponse,
  CellId,
  InstalledAppInfo,
  InstalledCell,
  RoleName,
} from "@holochain/client";
import isEqual from "lodash-es/isEqual";

import { serializeHash } from "./hash";

export function areCellIdsEqual(cellId1: CellId, cellId2: CellId): boolean {
  return isEqual(cellId1[0], cellId2[0]) && isEqual(cellId1[1], cellId2[1]);
}

// Get the cell data for the given cellId
export function findCellByCellId(
  appInfo: InstalledAppInfo,
  cellId: CellId
): InstalledCell | undefined {
  return appInfo.cell_data.find((c) => areCellIdsEqual(c.cell_id, cellId));
}

// Get the cell data for the given cellId
export function findCellByRoleId(
  appInfo: InstalledAppInfo,
  roleName: RoleName
): InstalledCell | undefined {
  return appInfo.cell_data.find((c) => c.role_name === roleName);
}

export function getCellIdForDnaHash(
  appInfo: AppInfoResponse,
  dnaHash: string
): CellId {
  const cell = appInfo.cell_data.find(
    (cellData) => serializeHash(cellData.cell_id[0]) === dnaHash
  );

  if (!cell) throw new Error(`Could not find cell for dna ${dnaHash}`);

  return cell.cell_id;
}
