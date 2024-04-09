use add_npm_dependency::add_npm_dependency;
use anyhow::Result;
use build_fs_tree::{Build, MergeableFileSystemTree};
use clap::Parser;
use colored::Colorize;
use std::{ffi::OsString, path::PathBuf, process::ExitCode};

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

    let file_tree = add_npm_dependency(
        file_tree,
        args.dependency.clone(),
        args.dependency_source,
        args.package_to_add_the_dependency_to,
        None,
    )?;

    let file_tree = MergeableFileSystemTree::<OsString, String>::from(file_tree);

    file_tree.build(&args.path)?;

    println!(
        "{}",
        format!(
            "Successfully added NPM dependency package {}",
            args.dependency.bold()
        )
        .green()
    );
    Ok(())
}
