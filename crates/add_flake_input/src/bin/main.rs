use add_flake_input::add_flake_input;
use anyhow::Result;
use build_fs_tree::{Build, MergeableFileSystemTree};
use clap::Parser;
use colored::Colorize;
use std::{ffi::OsString, path::PathBuf, process::ExitCode};

/// Adds a flake input to your flake.nix.
#[derive(Parser, Debug)]
pub struct Args {
    /// The name of the flake input.
    pub input_name: String,
    /// The flake reference to add as an input.
    pub input_url: String,

    /// The path of the file tree to modify.
    #[clap(long, default_value = "./")]
    pub(crate) path: PathBuf,
}

fn main() -> ExitCode {
    if let Err(err) = internal_main() {
        eprintln!("{}", format!("Error: {err:?}").red());
        return ExitCode::FAILURE;
    }
    ExitCode::SUCCESS
}

fn internal_main() -> Result<()> {
    let args = Args::parse();

    let file_tree = file_tree_utils::load_directory_into_memory(&args.path)?;

    let file_tree = add_flake_input(file_tree, args.input_name.clone(), args.input_url)?;

    let file_tree = MergeableFileSystemTree::<OsString, String>::from(file_tree);

    file_tree.build(&args.path)?;

    println!(
        "{}",
        format!("\nSuccessfully added input {}.", args.input_name.bold()).green(),
    );
    Ok(())
}
