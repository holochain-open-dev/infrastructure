import {
  AppAgentClient,
  AppAgentWebsocket,
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
        if (c[CellType.Cloned].cell_id.toString() === cellId.toString()) {
          return c[CellType.Cloned].clone_id;
        }
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
  if ((client as AppAgentWebsocket).cachedAppInfo) {
    const role = roleNameForCellId(
      (client as AppAgentWebsocket).cachedAppInfo,
      signal.cell_id
    );
    if (role) {
      return roleName === role;
    }
  }

  // Cache miss: most likely due to a new clone having been created,
  // So in this case we _should_ trigger a new fetch of the app info

  const appInfo = await client.appInfo();
  const role = roleNameForCellId(appInfo, signal.cell_id);

  return roleName === role;
}
