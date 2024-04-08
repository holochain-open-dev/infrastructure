use add_flake_input::add_flake_input;
use anyhow::Result;
use clap::Parser;
use std::path::PathBuf;

/// Adds a flake input to your flake.nix.
#[derive(Parser, Debug)]
pub struct Args {
    /// The flake.nix to modify.
    #[clap(long, default_value = "./flake.nix")]
    pub(crate) flake_path: PathBuf,
    /// The name of the flake input.
    pub input_name: String,
    /// The flake reference to add as an input.
    pub input_url: String,
}

fn main() -> Result<()> {
    let args = Args::parse();

    let flake_path = std::fs::canonicalize(args.flake_path)?;
    let flake_nix_contents = std::fs::read_to_string(&flake_path)?;

    let _root = rnix::Root::parse(&flake_nix_contents).ok()?;

    let new_flake_contents =
        add_flake_input(flake_nix_contents, args.input_name.clone(), args.input_url)?;

    std::fs::write(flake_path, new_flake_contents)?;

    println!("Successfully added input {}", args.input_name);
    Ok(())
}
