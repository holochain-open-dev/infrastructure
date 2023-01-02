# @holochain-open-dev/utils

Utilities to build Holochain web applications.

## HoloHashMap 

Dictionary of `HoloHash` to any JS object. 

We can't really use well normal JS objects to index by holo hashes because we lose the ability to compare hashes together. Namely, in JS `console.log(new Uint8Array([1]) == new Uint8Array([1]))` prints `false`.

```ts
// Imagine we have out public key
const myAgentPubKey = appInfo.cell_info[0].cell_id[1];

const map = new HoloHashMap<number>();

// We can add entries to the dictionary
map.put(myAgentPubKey, 1);

// Get the value for an entry
console.log(map.get(myAgentPubKey));    // Will print `1`

// Check if the key exists
console.log(map.has(myAgentPubKey));    // Will print `true`

// Get collections for the entries

console.log(map.keys());                // Will print an array with MYAGENTPUBKEY as the only member
console.log(map.values());              // Will print `[1]`
console.log(map.entries());             // Will print an array with `[MYAGENTPUBKEY, 1]` as the only member

console.log(map.delete(myAgentPubKey)); // Will delete this member
```

Some variants exist for this type:

- `EntryHashMap`
- `ActionHashMap`
- `AgentPubKeyMap`
- `DnaHashMap`

## EntryRecord

Utility to type a single `Record` and extract useful information from them.

```ts
import { Record } from '@holochain/client';
import { EntryRecord } from '@holochain-open-dev/utils';

// Imagine a zome function that returns a record,
// but we know its entry type
const record: Record = await callZome(...);             

// Then we can type it
const profileRecord = new EntryRecord<Profile>(record); 

// Access its entry easily
const profile: Profile = profileRecord.entry;           

// Access its action easily, timestamp will be in milliseconds
const action: Action = profileRecord.action;            

// Access its entry hash easily
const entryHash: EntryHash = profileRecord.entryHash;   

// Access its action hash easily
const actionHash: ActionHash = profileRecord.actionHash;
```

##  RecordBag

Utility to type a list of `Records` and extract useful information from them.

```ts
import { Record } from '@holochain/client';
import { RecordBag } from '@holochain-open-dev/utils';

// Imagine a zome function that returns a list of records,
// but we know their entry type
const records: Record[] = await callZome(...);          

// Then we can type it
const profiles = new RecordBag<Profile>(records);

// Map of entry hash -> entry
const profileEntries: EntryHashMap<Profile> = profiles.entryMap; 

// Map of action hash -> action
// Timestamps are in milliseconds
const profileActions: ActionHashMap<Action> = profiles.actionMap;

// Map of entry hash -> all the actions that have created or updated to that entry
const entryActions: EntryHashMap<ActionHash[]> = profiles.entryActions;

// For each agent, contains all the actions it has authored
const authorMap: AgentPubKeyMap<ActionHash[]> = profiles.authorMap;

// Get the array of all records
const profileEntries: Array<EntryRecord<Profile>> = profiles.entryRecords; 
```

