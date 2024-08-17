use std::{
    collections::{BTreeMap, BTreeSet},
    path::PathBuf,
};

use anyhow::anyhow;
use clap::Parser;
use holochain_types::{
    dna::{DnaFile, WasmHash},
    prelude::{DnaBundle, ZomeName},
};

/// Adds a flake input to your flake.nix.
#[derive(Parser, Debug)]
pub struct Args {
    /// The original DNA bundle to match the new bundle with
    pub original_dna_bundle: PathBuf,

    /// The new DNA bundle to match against the old one
    pub new_dna_bundle: PathBuf,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let args = Args::parse();

    let original_dna_bundle = DnaBundle::read_from_file(args.original_dna_bundle.as_path()).await?;
    let (original_dna_file, original_dna_hash) = original_dna_bundle
        .into_dna_file(Default::default())
        .await?;

    let new_dna_bundle = DnaBundle::read_from_file(args.new_dna_bundle.as_path()).await?;
    let (new_dna_file, new_dna_hash) = new_dna_bundle.into_dna_file(Default::default()).await?;

    if new_dna_hash.eq(&original_dna_hash) {
        // Both hashes match! Good boy
        return Ok(());
    }

    let name = new_dna_file.dna_def().name.clone();

    // Hashes don't match???
    // We need to find why...
    let compare_result = compare_integrity_zomes(original_dna_file, new_dna_file)?;
    Err(anyhow!(
        "DNA hashes for DNA {name} don't match! Reason: {compare_result}",
    ))
}

fn compare_integrity_zomes(
    original_dna_file: DnaFile,
    new_dna_file: DnaFile,
) -> anyhow::Result<anyhow::Error> {
    let original_integrity_zomes = collect_integrity_zomes(&original_dna_file)?;
    let new_integrity_zomes = collect_integrity_zomes(&new_dna_file)?;

    let original_zome_names: BTreeSet<ZomeName> =
        original_integrity_zomes.keys().cloned().collect();
    let new_zome_names: BTreeSet<ZomeName> = new_integrity_zomes.keys().cloned().collect();

    let missing_zomes: Vec<String> = original_zome_names
        .difference(&new_zome_names)
        .map(|zome_name| zome_name.to_string())
        .collect();

    if missing_zomes.len() > 0 {
        return Ok(anyhow!(
            "There are missing integrity zomes from the original DNA: {missing_zomes:?}"
        ));
    }

    let new_unexpected_zomes: Vec<String> = new_zome_names
        .difference(&original_zome_names)
        .map(|zome_name| zome_name.to_string())
        .collect();

    if new_unexpected_zomes.len() > 0 {
        return Ok(anyhow!(
            "There are new integrity zomes that didn't exist in the original DNA: {new_unexpected_zomes:?}"
        ));
    }

    for (zome_name, wasm_hash) in new_integrity_zomes {
        if !original_integrity_zomes
            .get(&zome_name)
            .unwrap()
            .eq(&wasm_hash)
        {
            return Ok(anyhow!(
                "The hash of the new integrity zome {:?} doesn't match the hash of the old integrity zome", 
                zome_name.to_string()
            ));
        }
    }

    return Err(anyhow!("No difference found in integrity zomes: can't detect why the DNA bundles produce different DNA hashes"));
}

fn collect_integrity_zomes(dna_file: &DnaFile) -> anyhow::Result<BTreeMap<ZomeName, WasmHash>> {
    let mut map: BTreeMap<ZomeName, WasmHash> = BTreeMap::new();
    for (zome_name, zome_def) in dna_file.dna_def().integrity_zomes.iter() {
        map.insert(zome_name.clone(), zome_def.wasm_hash(&zome_name)?.clone());
    }

    Ok(map)
}
