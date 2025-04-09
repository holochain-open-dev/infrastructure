import { AppInfo, CellType, ClonedCell, RoleName } from "@holochain/client";

// From https://github.com/holochain/holochain-client-js/blob/main/src/api/common.ts#L92
export const CLONE_ID_DELIMITER = ".";

export const isCloneId = (roleName: RoleName) =>
  roleName.includes(CLONE_ID_DELIMITER);

/**
 * Parse a clone id and get the role name part of it.
 *
 * @param roleName - The role name to parse.
 * @public
 */
export const getBaseRoleNameFromCloneId = (roleName: RoleName) => {
  if (!isCloneId(roleName)) {
    throw new Error(
      "invalid clone id: no clone id delimiter found in role name"
    );
  }
  return roleName.split(CLONE_ID_DELIMITER)[0];
};

export function getCellIdFromRoleName(roleName: RoleName, appInfo: AppInfo) {
  if (isCloneId(roleName)) {
    const baseRoleName = getBaseRoleNameFromCloneId(roleName);
    if (!(baseRoleName in appInfo.cell_info)) {
      throw new Error(`No cell found with role_name ${roleName}`);
    }
    const cloneCell = appInfo.cell_info[baseRoleName].find(
      (c) => c.type == CellType.Cloned && c.value.clone_id === roleName
    );
    if (!cloneCell || !(cloneCell.type == CellType.Cloned)) {
      throw new Error(`No clone cell found with clone id ${roleName}`);
    }
    return cloneCell.value.cell_id;
  }

  if (!(roleName in appInfo.cell_info)) {
    throw new Error(`No cell found with role_name ${roleName}`);
  }
  const cell = appInfo.cell_info[roleName].find(
    (c) => c.type == CellType.Provisioned
  );
  if (!cell || !(cell.type == CellType.Provisioned)) {
    throw new Error(`No provisioned cell found with role_name ${roleName}`);
  }
  return cell.value.cell_id;
}
