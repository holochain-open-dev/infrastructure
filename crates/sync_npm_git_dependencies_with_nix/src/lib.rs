use anyhow::Result;
use colored::Colorize;
use ignore::Walk;
use parse_flake_lock::{FlakeLock, FlakeLockParseError, Node};
use regex::Regex;
use serde_json::Value;
use std::{
    fs::File,
    io::BufReader,
    path::Path,
    process::{Command, Stdio},
};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum SynchronizeNpmGitDependenciesWithNixError {
    #[error(transparent)]
    FlakeLockParseError(#[from] FlakeLockParseError),

    /// std::io::Error
    #[error("IO error: {0}")]
    StdIoError(#[from] std::io::Error),

    #[error("JSON serialization error: {0}")]
    SerdeJsonError(#[from] serde_json::Error),

    #[error(transparent)]
    RegexError(#[from] regex::Error),

    #[error("Error parsing git {0} for dependency {1}")]
    ParseGitRepositoryError(String, String),
}

pub fn synchronize_npm_git_dependencies_with_nix(
) -> Result<(), SynchronizeNpmGitDependenciesWithNixError> {
    let flake_lock = FlakeLock::new(Path::new("flake.lock"))?;

    let mut announced = false;
    let mut replaced_some_dep = false;

    for entry in Walk::new(".").into_iter().filter_map(|e| e.ok()) {
        let f_name = entry.file_name().to_string_lossy();

        if f_name == "package.json" {
            let file = File::open(entry.path())?;
            let reader = BufReader::new(file);
            let mut package_json_contents: Value = serde_json::from_reader(reader)?;

            if let Some(Value::Object(deps)) = package_json_contents.get_mut("dependencies") {
                let re = Regex::new(r#"(github|gitlab):([^/]+)/([^#]+)#([^&"]+)(&.*)?$"#)?;

                for (_package, dependency_source) in deps {
                    if let Value::String(dependency_source_str) = dependency_source.clone() {
                        if let Some(captures) = re.captures(&dependency_source_str) {
                            let git_host = captures
                                .get(1)
                                .ok_or(
                                    SynchronizeNpmGitDependenciesWithNixError::ParseGitRepositoryError("username".into(), dependency_source_str.clone())
)?
                                .as_str();
                            let git_owner = captures
                                .get(2)
                                .ok_or(
                                    SynchronizeNpmGitDependenciesWithNixError::ParseGitRepositoryError("owner".into(), dependency_source_str.clone())
)?
                                .as_str();
                            let git_repo = captures
                                .get(3)
                                .ok_or(
                                    SynchronizeNpmGitDependenciesWithNixError::ParseGitRepositoryError("repository".into(), dependency_source_str.clone())
)?
                                .as_str();
                            let revision = captures
                                .get(4)
                                .ok_or(
                                    SynchronizeNpmGitDependenciesWithNixError::ParseGitRepositoryError("revision".into(), dependency_source_str.clone())
)?
                                .as_str();
                            let query_arguments =
                                captures.get(5).map(|c| c.as_str()).unwrap_or_default();

                            for root_node in flake_lock.root.values() {
                                if let Node::Repo(repo_node) = root_node {
                                    if repo_node.locked.owner == git_owner
                                        && repo_node.locked.repo == git_repo
                                        && revision != repo_node.locked.rev
                                    {
                                        *dependency_source = Value::String(format!(
                                            "{git_host}:{git_owner}/{git_repo}#{}{query_arguments}",
                                            repo_node.locked.rev
                                        ));

                                        if !announced {
                                            announced = true;
                                            println!("");
                                            println!(
                                        "Synchronizing npm git dependencies with the upstream nix sources..."
                                    );
                                        }

                                        println!(
                                    "  - Setting dependency \"{git_host}:{git_owner}/{git_repo}\" in file {:?} to rev \"{}\"",
                                    entry.path(), repo_node.locked.rev
                                );
                                        replaced_some_dep = true;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            let st = serde_json::to_string_pretty(&package_json_contents)?;

            std::fs::write(entry.path(), st)?;
        }
    }

    if replaced_some_dep {
        println!("Running pnpm install...");
        Command::new("pnpm")
            .arg("install")
            .stdout(Stdio::inherit())
            .output()?;
        println!(
            "{}",
            "Successfully synchronized npm dependencies with nix".green()
        );
    }

    Ok(())
}
