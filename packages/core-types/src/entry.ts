
export type EntryDefLocation =
    | { type: EntryDefLocationType.App; value: AppEntryDefLocation; }
    | { type: EntryDefLocationType.CapClaim }
    | { type: EntryDefLocationType.CapGrant }

export enum EntryDefLocationType {
    App,
    CapClaim,
    CapGrant,
}

export interface AppEntryDefLocation {
    zome_index: number,
    entry_def_index: number,
}


export interface GetOptions {
    strategy: GetStrategy;
}

export enum GetStrategy {
    Network,
    Local,
}