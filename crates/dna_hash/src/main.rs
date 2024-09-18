use std::path::PathBuf;

use clap::Parser;
use holochain_types::prelude::DnaBundle;

#[derive(Parser, Debug)]
pub struct Args {
    /// The DNA bundle to print the DNA hash for
    pub dna_bundle: PathBuf,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let args = Args::parse();

    let dna_bundle = DnaBundle::read_from_file(args.dna_bundle.as_path()).await?;
    let (_dna_file, dna_hash) = dna_bundle.into_dna_file(Default::default()).await?;

    println!("{}", dna_hash);

    Ok(())
}
