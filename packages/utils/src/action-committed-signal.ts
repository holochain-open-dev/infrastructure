import {
  Create,
  CreateLink,
  Delete,
  DeleteLink,
  SignedActionHashed,
  Update,
} from "@holochain/client";

/**
 * The type for the signal that the scaffolding tool produces in the post_commit of the coordinator zomes
 */
export type ActionCommittedSignal<
  ET extends { type: string },
  LT extends string
> =
  | {
      type: "EntryCreated";
      action: SignedActionHashed<Create>;
      app_entry: ET;
    }
  | {
      type: "EntryUpdated";
      action: SignedActionHashed<Update>;
      app_entry: ET;
      original_app_entry: ET;
    }
  | {
      type: "EntryDeleted";
      action: SignedActionHashed<Delete>;
      original_app_entry: ET;
    }
  | {
      type: "LinkCreated";
      action: SignedActionHashed<CreateLink>;
      link_type: LT;
    }
  | {
      type: "LinkDeleted";
      action: SignedActionHashed<DeleteLink>;
      create_link_action: SignedActionHashed<CreateLink>;
      link_type: LT;
    };

export type LinkTypeForSignal<S> = S extends ActionCommittedSignal<
  any,
  infer LT
>
  ? LT
  : string;
