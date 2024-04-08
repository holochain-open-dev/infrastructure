use anyhow::{anyhow, Result};
use build_fs_tree::{Build, MergeableFileSystemTree};
use clap::Parser;
use scaffold_remote_zome::scaffold_remote_zome;
use std::{
    ffi::OsString,
    path::{Path, PathBuf},
};

#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
struct Args {
    /// Name of the zome that's being scaffolded
    zome_name: String,

    /// URL for the git repository of the zome that's being scaffolded
    remote_zome_git_url: String,

    /// Name of the UI package for the zome that's being scaffolded
    #[arg(long)]
    remote_npm_package_name: String,

    /// Internal path of the UI package
    #[arg(long)]
    remote_npm_package_path: PathBuf,

    /// NPM package for the local repository in which the UI for the zome should be scaffolded
    #[arg(long)]
    local_npm_package_to_add_the_dependency_to: Option<String>,

    /// The path of the file tree to modify.
    #[clap(long, default_value = "./.")]
    pub path: PathBuf,
}

fn main() -> Result<()> {
    let args = Args::parse();

    let file_tree = file_tree_utils::load_directory_into_memory(&args.path)?;

    let file_tree = scaffold_remote_zome(
        file_tree,
        args.zome_name.clone(),
        args.remote_zome_git_url,
        args.remote_npm_package_name,
        args.remote_npm_package_path,
        args.local_npm_package_to_add_the_dependency_to,
    )?;

    let file_tree = MergeableFileSystemTree::<OsString, String>::from(file_tree);

    file_tree.build(&args.path)?;

    // Run nix flake update

    // Run nix develop -c bash "pnpm install"

    println!("Successfully scaffolded zome {}", args.zome_name);

    Ok(())
}
