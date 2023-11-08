import {
  ActionCommittedSignal,
  EntryRecord,
  LinkTypeForSignal,
  ZomeClient,
} from "@holochain-open-dev/utils";
import {
  ActionHash,
  CreateLink,
  decodeHashFromBase64,
  Delete,
  DeleteLink,
  encodeHashToBase64,
  HoloHash,
  SignedActionHashed,
} from "@holochain/client";
import { encode } from "@msgpack/msgpack";
import { readable } from "svelte/store";
import isEqual from "lodash-es/isEqual.js";

import { asyncReadable, AsyncReadable, AsyncStatus } from "./async-readable.js";
import { retryUntilSuccess } from "./retry-until-success.js";

/**
 * Keeps an up to date list of the targets for the non-deleted links in this DHT
 * Makes requests only while it has some subscriber
 *
 * Will do so by calling the given every 4 seconds calling the given fetch function,
 * and listening to `LinkCreated` and `LinkDeleted` signals
 *
 * Useful for link types
 */
export function liveLinksTargetsStore<
  BASE extends HoloHash,
  TARGET extends HoloHash,
  S extends ActionCommittedSignal<any, any>
>(
  client: ZomeClient<S>,
  baseAddress: BASE,
  fetchTargets: () => Promise<TARGET[]>,
  linkType: LinkTypeForSignal<S>
): AsyncReadable<Array<TARGET>> {
  return asyncReadable<TARGET[]>(async (set) => {
    let hashes: TARGET[];
    const fetch = async () => {
      const nhashes = await fetchTargets();
      if (!isEqual(nhashes, hashes)) {
        hashes = uniquify(nhashes);
        set(hashes);
      }
    };
    await fetch();
    const interval = setInterval(() => fetch(), 4000);
    const unsubs = client.onSignal((signal) => {
      if (signal.type === "LinkCreated") {
        if (
          linkType in signal.link_type &&
          signal.action.hashed.content.base_address.toString() ===
            baseAddress.toString()
        ) {
          hashes = uniquify([
            ...hashes,
            signal.action.hashed.content.target_address as TARGET,
          ]);
          set(hashes);
        }
      } else if (signal.type === "LinkDeleted") {
        if (
          linkType in signal.link_type &&
          signal.create_link_action.hashed.content.base_address.toString() ===
            baseAddress.toString()
        ) {
          hashes = uniquify(
            hashes.filter(
              (h) =>
                h.toString() !==
                signal.create_link_action.hashed.content.target_address.toString()
            )
          );
          set(hashes);
        }
      }
    });
    return () => {
      clearInterval(interval);
      unsubs();
    };
  });
}

/**
 * Keeps an up to date list of the targets for the non-deleted links for the given collection in this DHT
 * Makes requests only while it has some subscriber
 *
 * Will do so by calling the given every 4 seconds calling the given fetch function,
 * and listening to `LinkCreated` and `LinkDeleted` signals
 *
 * Useful for collections
 */
export function collectionStore<
  H extends HoloHash,
  S extends ActionCommittedSignal<any, any>
>(
  client: ZomeClient<S>,
  fetchCollection: () => Promise<H[]>,
  linkType: string
): AsyncReadable<Array<H>> {
  return asyncReadable<H[]>(async (set) => {
    let hashes: H[];
    const fetch = async () => {
      const nhashes = await fetchCollection();
      if (!isEqual(nhashes, hashes)) {
        hashes = uniquify(nhashes);
        set(hashes);
      }
    };
    await fetch();
    const interval = setInterval(() => fetch(), 4000);
    const unsubs = client.onSignal((signal) => {
      if (signal.type === "LinkCreated") {
        if (linkType in signal.link_type) {
          hashes = uniquify([
            ...hashes,
            signal.action.hashed.content.target_address as H,
          ]);
          set(hashes);
        }
      } else if (signal.type === "LinkDeleted") {
        if (linkType in signal.link_type) {
          hashes = uniquify(
            hashes.filter(
              (h) =>
                h.toString() !==
                signal.create_link_action.hashed.content.target_address.toString()
            )
          );
          set(hashes);
        }
      }
    });
    return () => {
      clearInterval(interval);
      unsubs();
    };
  });
}

export class NotFoundError extends Error {
  constructor() {
    super("NOT_FOUND");
  }
}

export class ConflictingUpdatesError extends Error {
  constructor(public conflictingUpdates: Array<EntryRecord<any>>) {
    super("CONFLICTING_UPDATES");
  }
}

/**
 * Fetches the given entry, retrying if there is a failure
 * Makes requests only the first time it is subscribed to, and will stop after it succeeds in fetching the entry
 *
 * Useful for entries that can't be updated
 */
export function immutableEntryStore<T>(
  fetch: () => Promise<EntryRecord<T> | undefined>
): AsyncReadable<EntryRecord<T>> {
  return retryUntilSuccess(async () => {
    const entry = await fetch();
    if (!entry) throw new NotFoundError();
    return entry;
  });
}

/**
 * Keeps an up to date copy of the latest version of an entry
 * Makes requests only while it has some subscriber
 *
 * Will do so by calling the given every 4 seconds calling the given fetch function,
 * and listening to `EntryUpdated` signals
 *
 * Useful for entries that can be updated
 */
export function latestVersionOfEntryStore<
  T,
  S extends ActionCommittedSignal<any, any>
>(
  client: ZomeClient<S>,
  fetchLatestVersion: () => Promise<EntryRecord<T> | undefined>
): AsyncReadable<EntryRecord<T>> {
  return readable<AsyncStatus<EntryRecord<T>>>({ status: "pending" }, (set) => {
    let latestVersion: EntryRecord<T> | undefined;
    const fetch = async () => {
      try {
        const nlatestVersion = await fetchLatestVersion();
        if (nlatestVersion) {
          if (!isEqual(latestVersion, nlatestVersion)) {
            latestVersion = nlatestVersion;
            set({
              status: "complete",
              value: latestVersion,
            });
          }
        } else {
          set({
            status: "error",
            error: new NotFoundError(),
          });
        }
      } catch (e) {
        set({
          status: "error",
          error: e,
        });
      }
    };
    fetch();
    const interval = setInterval(() => fetch(), 4000);
    const unsubs = client.onSignal(async (signal) => {
      if (
        signal.type === "EntryUpdated" &&
        latestVersion &&
        latestVersion.actionHash.toString() ===
          signal.action.hashed.content.original_action_address.toString()
      ) {
        latestVersion = new EntryRecord({
          entry: {
            Present: {
              entry_type: "App",
              entry: encode(signal.app_entry),
            },
          },
          signed_action: signal.action,
        });
        set({
          status: "complete",
          value: latestVersion,
        });
      }
    });
    return () => {
      clearInterval(interval);
      unsubs();
    };
  });
}

/**
 * Keeps an up to date list of the targets for the deleted links in this DHT
 * Makes requests only while it has some subscriber
 *
 * Will do so by calling the given every 4 seconds calling the given fetch function,
 * and listening to `LinkDeleted` signals
 *
 * Useful for link types and collections with some form of archive retrieving functionality
 */
export function deletedLinksTargetsStore<
  BASE extends HoloHash,
  TARGET extends HoloHash,
  S extends ActionCommittedSignal<any, any>
>(
  client: ZomeClient<S>,
  baseAddress: BASE,
  fetchDeletedTargets: () => Promise<
    Array<[CreateLink, Array<SignedActionHashed<DeleteLink>>]>
  >,
  linkType: LinkTypeForSignal<S>
): AsyncReadable<Array<[CreateLink, Array<SignedActionHashed<DeleteLink>>]>> {
  return asyncReadable(async (set) => {
    let deletedTargets: Array<
      [CreateLink, Array<SignedActionHashed<DeleteLink>>]
    >;
    const fetch = async () => {
      const ndeletedTargets = await fetchDeletedTargets();
      if (!isEqual(deletedTargets, ndeletedTargets)) {
        deletedTargets = ndeletedTargets;
        set(deletedTargets);
      }
    };
    await fetch();
    const interval = setInterval(() => fetch(), 4000);
    const unsubs = client.onSignal((signal) => {
      if (signal.type === "LinkDeleted") {
        if (
          linkType in signal.link_type &&
          signal.create_link_action.hashed.content.base_address.toString() ===
            baseAddress.toString()
        ) {
          const target_address = signal.create_link_action.hashed.content
            .target_address as TARGET;
          const alreadyDeletedTargetIndex = deletedTargets.findIndex(
            ([cl]) => cl.target_address.toString() === target_address.toString()
          );

          if (alreadyDeletedTargetIndex !== -1) {
            deletedTargets[alreadyDeletedTargetIndex][1].push(signal.action);
          } else {
            deletedTargets = [
              ...deletedTargets,
              [signal.create_link_action.hashed.content, [signal.action]],
            ];
          }
          set(deletedTargets);
        }
      }
    });
    return () => {
      clearInterval(interval);
      unsubs();
    };
  });
}

/**
 * Keeps an up to date list of the deletes for an entry
 * Makes requests only while it has some subscriber
 *
 * Will do so by calling the given every 4 seconds calling the given fetch function,
 * and listening to `EntryDeleted` signals
 *
 * Useful for entries that can be deleted
 */
export function deletesForEntryStore<S extends ActionCommittedSignal<any, any>>(
  client: ZomeClient<S>,
  originalActionHash: ActionHash,
  fetchDeletes: () => Promise<Array<SignedActionHashed<Delete>>>
): AsyncReadable<Array<SignedActionHashed<Delete>>> {
  return asyncReadable(async (set) => {
    let deletes: Array<SignedActionHashed<Delete>>;
    const fetch = async () => {
      const ndeletes = await fetchDeletes();
      if (!isEqual(deletes, ndeletes)) {
        deletes = ndeletes;
        set(deletes);
      }
    };
    await fetch();
    const interval = setInterval(() => fetch(), 4000);
    const unsubs = client.onSignal(async (signal) => {
      if (
        signal.type === "EntryDeleted" &&
        signal.action.hashed.content.deletes_address.toString() ===
          originalActionHash.toString()
      ) {
        deletes = [...deletes, signal.action];
        set(deletes);
      }
    });
    return () => {
      clearInterval(interval);
      unsubs();
    };
  });
}

export function uniquify<H extends HoloHash>(array: Array<H>): Array<H> {
  const strArray = array.map((h) => encodeHashToBase64(h));
  const uniqueArray = [...new Set(strArray)];
  return uniqueArray.map((h) => decodeHashFromBase64(h) as H);
}
