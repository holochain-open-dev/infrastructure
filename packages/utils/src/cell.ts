import {
  AppAgentClient,
  AppInfo,
  AppSignal,
  CellId,
  CellType,
  RoleName,
} from "@holochain/client";

export function roleNameForCellId(
  appInfo: AppInfo,
  cellId: CellId
): RoleName | undefined {
  for (const [role, cells] of Object.entries(appInfo.cell_info)) {
    for (const c of cells) {
      if (CellType.Provisioned in c) {
        if (c[CellType.Provisioned].cell_id.toString() === cellId.toString()) {
          return role;
        }
      } else if (CellType.Cloned in c) {
        return c[CellType.Cloned].clone_id ? c[CellType.Cloned].clone_id : role;
      }
    }
  }
  return undefined;
}

export async function isSignalFromCellWithRole(
  client: AppAgentClient,
  roleName: RoleName,
  signal: AppSignal
): Promise<boolean> {
  const appInfo = await client.appInfo();
  const role = roleNameForCellId(appInfo, signal.cell_id);

  return roleName === role;
}
