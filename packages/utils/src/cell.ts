import {
  AppAgentClient,
  AppInfo,
  AppSignal,
  CellId,
  RoleName,
} from "@holochain/client";

export function roleNameForCellId(
  appInfo: AppInfo,
  cellId: CellId
): RoleName | undefined {
  for (const [role, cells] of Object.entries(appInfo.cell_info)) {
    for (const c of cells) {
      if ("Provisioned" in c) {
        if (c["Provisioned"].cell_id.toString() === cellId.toString()) {
          return role;
        }
      } else if ("Cloned" in c) {
        return c["Cloned"].clone_id ? c["Cloned"].clone_id : role;
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
