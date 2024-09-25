import { AppCallZomeRequest, AppClient, SignalType } from "@holochain/client";
import { UnsubscribeFunction } from "emittery";
import { isSignalFromCellWithRole } from "./cell.js";

export class ZomeClient<SIGNAL_PAYLOAD> {
  constructor(
    public client: AppClient,
    public roleName: string,
    public zomeName: string
  ) {}

  onSignal(
    listener: (eventData: SIGNAL_PAYLOAD) => void | Promise<void>,
    signalType: typeof SignalType.App | typeof SignalType.System
  ): UnsubscribeFunction {
    return this.client.on("signal", async (signal) => {
      if (
        signal[signalType] &&
        (await isSignalFromCellWithRole(this.client, this.roleName, signal)) &&
        this.zomeName === signal[signalType].zome_name
      ) {
        listener(signal[signalType]?.payload as SIGNAL_PAYLOAD);
      }
    });
  }

  onAppSignal(
    listener: (eventData: SIGNAL_PAYLOAD) => void | Promise<void>,
  ): UnsubscribeFunction {
    return this.onSignal(listener, SignalType.App);
  }

  onSystemSignal(
    listener: (eventData: SIGNAL_PAYLOAD) => void | Promise<void>,
  ): UnsubscribeFunction {
    return this.onSignal(listener, SignalType.System);
  }

  protected callZome(fn_name: string, payload: any) {
    const req: AppCallZomeRequest = {
      role_name: this.roleName,
      zome_name: this.zomeName,
      fn_name,
      payload,
    };
    return this.client.callZome(req);
  }
}
