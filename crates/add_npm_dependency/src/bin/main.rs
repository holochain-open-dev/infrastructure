use add_npm_dependency::add_npm_dependency;
use anyhow::Result;
use build_fs_tree::{Build, MergeableFileSystemTree};
use clap::Parser;
use std::{ffi::OsString, path::PathBuf};

/// Adds a flake input to your flake.nix.
#[derive(Parser, Debug)]
pub struct Args {
    /// The name of the NPM dependency package to add to the project.
    pub dependency: String,
    /// The source of the NPM dependency package.
    /// See https://docs.npmjs.com/cli/v10/configuring-npm/package-json#dependencies for all the types of sources available.
    pub dependency_source: String,

    /// The **local** NPM package to add the dependency to.
    #[clap(long)]
    pub package_to_add_the_dependency_to: Option<String>,

    /// The path of the file tree to modify.
    #[clap(long, default_value = "./.")]
    pub path: PathBuf,

    /// The path of the file tree to modify.
    #[clap(long)]
    pub select_npm_package_prompt: Option<String>,
}

fn main() -> Result<()> {
    let args = Args::parse();

    let file_tree = file_tree_utils::load_directory_into_memory(&args.path)?;

    let file_tree = add_npm_dependency(
        file_tree,
        args.dependency.clone(),
        args.dependency_source,
        args.package_to_add_the_dependency_to,
        args.select_npm_package_prompt,
    )?;

    let file_tree = MergeableFileSystemTree::<OsString, String>::from(file_tree);

    file_tree.build(&args.path)?;

    println!(
        "Successfully added NPM dependency package {}",
        args.dependency
    );
    Ok(())
}
