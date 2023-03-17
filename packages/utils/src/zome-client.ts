import { AppAgentClient } from "@holochain/client";
import { UnsubscribeFunction } from "emittery";
import { isSignalFromCellWithRole } from "./cell.js";

export class ZomeClient<SIGNAL_PAYLOAD> {
  constructor(
    public client: AppAgentClient,
    public roleName: string,
    public zomeName: string
  ) {}

  onSignal(
    listener: (eventData: SIGNAL_PAYLOAD) => void | Promise<void>
  ): UnsubscribeFunction {
    return this.client.on("signal", async (signal) => {
      if (
        (await isSignalFromCellWithRole(this.client, this.roleName, signal)) &&
        this.zomeName === signal.zome_name
      ) {
        listener(signal.payload as SIGNAL_PAYLOAD);
      }
    });
  }
}
