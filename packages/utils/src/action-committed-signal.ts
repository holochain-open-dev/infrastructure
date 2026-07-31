import { Create, CreateLink, Delete, DeleteLink, Update } from "@holochain/client";

import { SignedTypedActionHashed } from "./action.js";

/**
 * The type for the signal that the scaffolding tool produces in the post_commit of the coordinator zomes
 */
export type ActionCommittedSignal<
  ET extends { type: string },
  LT extends string,
> =
  | {
      type: "EntryCreated";
      action: SignedTypedActionHashed<Create>;
      app_entry: ET;
    }
  | {
      type: "EntryUpdated";
      action: SignedTypedActionHashed<Update>;
      app_entry: ET;
      original_app_entry: ET;
    }
  | {
      type: "EntryDeleted";
      action: SignedTypedActionHashed<Delete>;
      original_app_entry: ET;
    }
  | {
      type: "LinkCreated";
      action: SignedTypedActionHashed<CreateLink>;
      link_type: LT;
    }
  | {
      type: "LinkDeleted";
      action: SignedTypedActionHashed<DeleteLink>;
      create_link_action: SignedTypedActionHashed<CreateLink>;
      link_type: LT;
    };

export type LinkTypeForSignal<S> =
  S extends ActionCommittedSignal<any, infer LT> ? LT : string;
