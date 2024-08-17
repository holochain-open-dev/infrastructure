use std::path::PathBuf;

use clap::Parser;
use holochain_types::dna::HashableContentExtAsync;
use holochain_types::prelude::DnaWasm;

/// Adds a flake input to your flake.nix.
#[derive(Parser, Debug)]
pub struct Args {
    /// The path to the zome wasm to print the hash for
    pub wasm_path: PathBuf,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let args = Args::parse();

    let bytes = std::fs::read(args.wasm_path)?;

    let wasm = DnaWasm::from(bytes);

    println!("{}", wasm.to_hash().await);

    Ok(())
}
