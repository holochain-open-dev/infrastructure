import {
  ActionData,
  ActionHeader,
  Create,
  HoloHashed,
  RecordEntry,
  Signature,
  Update,
} from "@holochain/client";

/**
 * Entry-creating action data: replaces the `NewEntryAction` type that was
 * removed from @holochain/client in 0.21.0.
 */
export type NewEntryActionData = Create | Update;

/**
 * All action data variants.
 *
 * Workaround: `Create` and `Update` are missing from the `ActionData` union
 * in @holochain/client 0.21.0-rc.1, even though they are present in the
 * `ActionData` enum in holochain 0.7.0-rc and the conductor still produces
 * them. Remove this type once they are added back upstream.
 */
export type AnyActionData = ActionData | NewEntryActionData;

/**
 * Same shape as `Action` from @holochain/client, but allows narrowing the
 * action data to a specific variant, e.g. `TypedAction<Create>`.
 */
export interface TypedAction<D extends AnyActionData = AnyActionData> {
  header: ActionHeader;
  data: D;
}

/**
 * An action with any data variant, including `Create` and `Update`.
 */
export type AnyAction = TypedAction<AnyActionData>;

/**
 * Same shape as `SignedActionHashed` from @holochain/client, but allows
 * narrowing the action data to a specific variant.
 */
export interface SignedTypedActionHashed<
  D extends AnyActionData = AnyActionData,
> {
  hashed: HoloHashed<TypedAction<D>>;
  signature: Signature;
}

/**
 * Same shape as `Record` from @holochain/client, but with the action data
 * allowed to be any variant, including `Create` and `Update`. `Record` is
 * assignable to this type.
 */
export interface AnyRecord {
  signed_action: SignedTypedActionHashed;
  entry: RecordEntry;
}
