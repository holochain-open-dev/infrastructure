import {
  AppClient,
  AppWebsocket,
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
      if (c.type == CellType.Provisioned) {
        if (c.value.cell_id.toString() === cellId.toString()) {
          return role;
        }
      } else if (c.type == CellType.Cloned) {
        if (c.value.cell_id.toString() === cellId.toString()) {
          return c[CellType.Cloned].clone_id;
        }
      }
    }
  }
  return undefined;
}

export async function isSignalFromCellWithRole(
  client: AppClient,
  roleName: RoleName,
  signal: AppSignal
): Promise<boolean> {
  if ((client as AppWebsocket).cachedAppInfo) {
    const role = roleNameForCellId(
      (client as AppWebsocket).cachedAppInfo,
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
