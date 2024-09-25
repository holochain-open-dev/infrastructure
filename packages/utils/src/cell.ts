import {
  AppClient,
  AppWebsocket,
  AppInfo,
  CellId,
  CellType,
  RoleName,
  Signal,
  SignalType,
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
  client: AppClient,
  roleName: RoleName,
  signal: Signal
): Promise<boolean> {
  const cellId = signal[SignalType.App] ? signal[SignalType.App].cell_id : signal[SignalType.System].cell_id;

  if ((client as AppWebsocket).cachedAppInfo) {
    const role = roleNameForCellId(
      (client as AppWebsocket).cachedAppInfo,
      cellId
    );
    if (role) {
      return roleName === role;
    }
  }

  // Cache miss: most likely due to a new clone having been created,
  // So in this case we _should_ trigger a new fetch of the app info

  const appInfo = await client.appInfo();
  const role = roleNameForCellId(appInfo, cellId);

  return roleName === role;
}
