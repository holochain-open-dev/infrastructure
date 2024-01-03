use hdk::prelude::{holochain_serial, AnyDhtHash, SerializedBytes};
use holo_hash::{AnyDhtHashB64, DnaHash, DnaHashB64};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, SerializedBytes, Clone)]
#[serde(into = "String", try_from = "String")]
pub struct Hrl {
    pub dna_hash: DnaHash,
    pub resource_hash: AnyDhtHash,
}

impl Into<String> for Hrl {
    fn into(self) -> String {
        let dna_hash_b64 = DnaHashB64::from(self.dna_hash);
        let resource_hash_b64 = AnyDhtHashB64::from(self.resource_hash);
        format!("hrl://{dna_hash_b64}/{resource_hash_b64}")
    }
}

impl TryFrom<String> for Hrl {
    type Error = String;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        if !value.starts_with("hrl://") {
            return Err(String::from("Malformed HRL: does not start with hrl://"));
        }

        let without_prefix = value.strip_prefix("hrl://").unwrap();

        let components: Vec<&str> = without_prefix.split('/').into_iter().collect();

        if components.len() != 2 {
            return Err(String::from(
                "Malformed HRL: does not have two hashes as components after hrl://",
            ));
        }

        let dna_hash_b64 = DnaHashB64::from_b64_str(components[0])
            .map_err(|err| format!("Malformed HRL: {err:?}"))?;
        let resource_hash_b64 = AnyDhtHashB64::from_b64_str(components[1])
            .map_err(|err| format!("Malformed HRL: {err:?}"))?;

        let dna_hash = DnaHash::from(dna_hash_b64);
        let resource_hash = AnyDhtHash::from(resource_hash_b64);

        Ok(Hrl {
            dna_hash,
            resource_hash,
        })
    }
}
