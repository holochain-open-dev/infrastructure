use anyhow::{anyhow, Result};
use ignore::Walk;
use parse_flake_lock::{FlakeLock, Node};
use regex::Regex;
use serde_json::Value;
use std::{fs::File, io::BufReader, path::Path, process::Command};

fn main() -> Result<()> {
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
                                .ok_or(anyhow!(
                                    "Error parsing git username for dependency {dependency_source_str}"
                                ))?
                                .as_str();
                            let git_owner = captures
                                .get(2)
                                .ok_or(anyhow!(
                                    "Error parsing git owner for dependency {dependency_source_str}"
                                ))?
                                .as_str();
                            let git_repo = captures
                                .get(3)
                                .ok_or(anyhow!(
                                    "Error parsing git repository for dependency {dependency_source_str}"
                                ))?
                                .as_str();
                            let revision = captures
                                .get(4)
                                .ok_or(anyhow!(
                                    "Error parsing git revision for dependency {dependency_source_str}"
                                ))?
                                .as_str();
                            let query_arguments = captures
                                .get(5)
                                .ok_or(anyhow!(
                                    "Error parsing query arguments for dependency {dependency_source_str}"
                                ))?
                                .as_str();

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
        Command::new("pnpm").arg("install").output()?;
        println!("Successfully synchronized npm dependencies with nix");
    }

    Ok(())
}
