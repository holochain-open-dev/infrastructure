use anyhow::Result;
use ignore::Walk;
use serde_json::Value;
use std::{collections::HashMap, fs::File, io::BufReader, process::Command};

use clap::Parser;

#[derive(Parser)]
#[command(version, about, long_about = None)]
struct Cli {
    /// List of dependencies to replace, in the form <NPM_PACKAGE_NAME>=<NEW_SOURCE_FOR_PACKAGE>
    dependencies_to_replace: Vec<String>,
}

fn parse_args() -> Result<HashMap<String, String>> {
    let cli = Cli::parse();

    let mut deps: HashMap<String, String> = HashMap::new();

    for dep in cli.dependencies_to_replace {
        let split: Vec<&str> = dep.split('=').into_iter().collect();
        deps.insert(split[0].to_string(), split[1].to_string());
    }

    Ok(deps)
}

fn main() -> Result<()> {
    let deps_to_replace = parse_args()?;

    let mut announced = false;
    let mut replaced_some_dep = false;

    for entry in Walk::new(".").into_iter().filter_map(|e| e.ok()) {
        let f_name = entry.file_name().to_string_lossy();

        if f_name == "package.json" {
            let file = File::open(entry.path())?;
            let reader = BufReader::new(file);
            let mut package_json_contents: Value = serde_json::from_reader(reader)?;

            if let Some(Value::Object(deps)) = package_json_contents.get_mut("dependencies") {
                for (dep_to_replace, new_source) in &deps_to_replace {
                    if let Some(found_dep) = deps.get_mut(dep_to_replace) {
                        match &found_dep {
                            Value::String(old_source) if old_source.eq(new_source) => {}
                            _ => {
                                *found_dep = Value::String(new_source.clone());

                                if !announced {
                                    announced = true;
                                    println!("");
                                    println!(
                                        "Synchronizing npm dependencies with the upstream nix sources..."
                                    );
                                }

                                println!(
                                    "  - Setting dependency \"{dep_to_replace}\" in file {:?} to \"{new_source}\"",
                                    entry.path()
                                );
                                replaced_some_dep = true;
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
        println!("Running npm install...");
        Command::new("npm").arg("install").output()?;
        println!("Successfully synchronized npm dependencies with nix");
    }

    Ok(())
}
