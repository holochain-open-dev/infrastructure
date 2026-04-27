import {
  CallZomeRequest,
  AppClient,
  RoleNameCallZomeRequest,
  Signal,
} from "@holochain/client";
import { UnsubscribeFunction } from "emittery";
import { isSignalFromCellWithRole } from "./cell.js";

export class ZomeClient<SIGNAL_PAYLOAD> {
  constructor(
    public client: AppClient,
    public roleName: string,
    public zomeName: string
  ) {}

  onSignal(
    listener: (eventData: SIGNAL_PAYLOAD) => void | Promise<void>
  ): UnsubscribeFunction {
    return this.client.on("signal", async (signal) => {
      if (
        signal.type === "app" &&
        (await isSignalFromCellWithRole(
          this.client,
          this.roleName,
          signal.value
        )) &&
        this.zomeName === signal.value.zome_name
      ) {
        listener(signal.value.payload as SIGNAL_PAYLOAD);
      }
    });
  }

  protected callZome(fn_name: string, payload: any) {
    const req: RoleNameCallZomeRequest = {
      role_name: this.roleName,
      zome_name: this.zomeName,
      fn_name,
      payload,
    };
    return this.client.callZome(req);
  }
}
