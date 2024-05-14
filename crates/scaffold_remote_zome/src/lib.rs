use nix_scaffolding_utils::{add_flake_input, AddFlakeInputError};
use npm_scaffolding_utils::{add_npm_dependency, NpmScaffoldingUtilsError};
use anyhow::Result;
use dialoguer::{theme::ColorfulTheme, Select};
use file_tree_utils::{
    find_files_by_extension, find_files_by_name, insert_file, map_file, FileTree, FileTreeError,
};
use holochain_types::prelude::{
    DnaManifest, DnaManifestCurrentBuilder, ZomeDependency, ZomeLocation,
};
use path_clean::PathClean;
use regex::{Captures, Regex};
use std::path::PathBuf;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ScaffoldRemoteZomeError {
    #[error(transparent)]
    AddNpmDependencyError(#[from] NpmScaffoldingUtilsError),

    #[error(transparent)]
    IoError(#[from] std::io::Error),

    #[error(transparent)]
    RegexError(#[from] regex::Error),

    #[error(transparent)]
    AddFlakeInputError(#[from] AddFlakeInputError),

    #[error(transparent)]
    DialoguerError(#[from] dialoguer::Error),

    #[error(transparent)]
    FileTreeError(#[from] FileTreeError),

    #[error("No nixified DNAs were found in this project.")]
    NoDnasFoundError,

    #[error("The dna {0} was not found in this project.")]
    DnaNotFoundError(String),

    #[error("No \"zomes = {{\" code property was found in the nix file {0:?}.")]
    ZomesPropertyNotFoundError(PathBuf),

    #[error("No integrity or coordinator zomes were specified to be scaffolded.")]
    NoZomesSpecifiedError,

    #[error(transparent)]
    SerdeYamlError(#[from] serde_yaml::Error),

    #[error("Malformed DNA manifest at {0}: {1}")]
    MalformedDnaManifest(PathBuf, String),
}

pub fn scaffold_remote_zome(
    file_tree: FileTree,
    module_name: String,
    integrity_zome_name: Option<String>,
    coordinator_zome_name: Option<String>,
    remote_zome_git_url: String,
    remote_zome_git_branch: Option<String>,
    remote_npm_package_name: String,
    remote_npm_package_path: PathBuf,
    local_dna_to_add_the_zome_to: Option<String>,
    local_npm_package_to_add_the_ui_to: Option<String>,
) -> Result<FileTree, ScaffoldRemoteZomeError> {
    let nix_git_url = format!(
        "{remote_zome_git_url}{}",
        remote_zome_git_branch
            .clone()
            .map(|b| format!("/{b}"))
            .unwrap_or_default()
    );
    let mut file_tree = add_flake_input(file_tree, module_name.clone(), nix_git_url.clone())?;

    let dna = get_or_choose_dna(&file_tree, &module_name, local_dna_to_add_the_zome_to)?;

    add_zome_to_nixified_dna(
        &mut file_tree,
        dna,
        &module_name,
        integrity_zome_name,
        coordinator_zome_name,
    )?;

    let npm_dependency_source = format!(
        "{remote_zome_git_url}{}&path:{}",
        remote_zome_git_branch
            .map(|b| format!("#{b}"))
            .unwrap_or_default(),
        remote_npm_package_path.to_str().unwrap()
    );

    let m = module_name.clone();

    let clo = move |packages| select_npm_package(m.clone(), packages);

    let file_tree = add_npm_dependency(file_tree, remote_npm_package_name, npm_dependency_source, local_npm_package_to_add_the_ui_to, Some(Box::new(clo)))?;

    Ok(file_tree)
}

fn select_npm_package(module_name: String, npm_packages: Vec<String>) -> Result<usize, NpmScaffoldingUtilsError> {
    let mut i = 0;
    let mut found = false;

    while !found {
        let package = &npm_packages[i];
        if !(package.ends_with("-dev") || package.contains("test")) {
            found = true;
        } else {
            i += 1;
        }
    }

    let default = i;
    
    Ok(Select::with_theme(&ColorfulTheme::default())
        .with_prompt(
        format!(    
"Multiple NPM packages were found in this project, choose one to add the UI package for the {module_name} zome:"))
        .default(default)
        .items(&npm_packages[..])
        .interact()?)
}

#[derive(Debug, Clone)]
pub struct NixifiedDna {
    name: String,
    dna_nix: (PathBuf, String),
    dna_manifest: (PathBuf, String),
    dna_manifest_reference_index: usize,
}

fn add_zome_to_nixified_dna(
    file_tree: &mut FileTree,
    nixified_dna: NixifiedDna,
    module_name: &String,
    integrity_zome_name: Option<String>,
    coordinator_zome_name: Option<String>,
) -> Result<(), ScaffoldRemoteZomeError> {
    if integrity_zome_name.is_none() && coordinator_zome_name.is_none() {
        return Err(ScaffoldRemoteZomeError::NoZomesSpecifiedError);
    }

    let integrity_string_to_add = integrity_zome_name
        .clone()
        .map(|name| format!("\n          {name} = inputs'.{module_name}.packages.{name};"))
        .unwrap_or_default();
    let coordinator_string_to_add = coordinator_zome_name
        .clone()
        .map(|name| format!("\n          {name} = inputs'.{module_name}.packages.{name};"))
        .unwrap_or_default();
    let string_to_add = format!("{integrity_string_to_add}{coordinator_string_to_add}");

    map_file(
        file_tree,
        &nixified_dna.dna_nix.0.clone(),
        |mut dna_contents| {
            let zomes_re = Regex::new(r#"zomes = \{"#)?;

            let captures_iter: Vec<Captures<'_>> = zomes_re.captures_iter(&dna_contents).collect();

            match captures_iter.len() {
                0 => {
                    return Err(ScaffoldRemoteZomeError::ZomesPropertyNotFoundError(
                        nixified_dna.dna_nix.0.clone(),
                    ));
                }
                1 => Ok(zomes_re
                    .replace(&dna_contents, format!("zomes = {{{string_to_add}"))
                    .to_string()),
                _ => {
                    let distance_to_dna_manifest = |captures: &Captures<'_>| {
                        ((nixified_dna.dna_manifest_reference_index as isize)
                            - captures.get(0).unwrap().start() as isize)
                            .abs() as usize
                    };
                    let captures = captures_iter
                        .into_iter()
                        .min_by_key(distance_to_dna_manifest)
                        .unwrap();

                    dna_contents.insert_str(captures.get(0).unwrap().end(), &string_to_add);

                    Ok(dna_contents)
                }
            }
        },
    )?;

    println!("Added the integrity zome {integrity_zome_name:?} and the coordinator zome {coordinator_zome_name:?} to {:?}.", nixified_dna.dna_nix.0);

    let dna_manifest: DnaManifest = serde_yaml::from_str(nixified_dna.dna_manifest.1.as_str())?;

    let (mut integrity_manifest, mut coordinator_manifest) = match dna_manifest.clone() {
        DnaManifest::V1(m) => (m.integrity, m.coordinator),
    };
    if let Some(integrity_zome) = integrity_zome_name.clone() {
        integrity_manifest
            .zomes
            .push(holochain_types::prelude::ZomeManifest {
                name: integrity_zome.into(),
                hash: None,
                location: ZomeLocation::Bundled(PathBuf::from("<NIX_PACKAGE>")),
                dependencies: None,
                dylib: None,
            });
    }
    if let Some(coordinator_zome) = coordinator_zome_name.clone() {
        coordinator_manifest
            .zomes
            .push(holochain_types::prelude::ZomeManifest {
                name: coordinator_zome.into(),
                hash: None,
                location: ZomeLocation::Bundled(PathBuf::from("<NIX_PACKAGE>")),
                dependencies: integrity_zome_name
                    .clone()
                    .map(|name| vec![ZomeDependency { name: name.into() }]),
                dylib: None,
            });
    }

    let new_manifest: DnaManifest = DnaManifestCurrentBuilder::default()
        .coordinator(coordinator_manifest)
        .integrity(integrity_manifest)
        .name(dna_manifest.name())
        .build()
        .unwrap()
        .into();

    insert_file(
        file_tree,
        &nixified_dna.dna_manifest.0,
        &serde_yaml::to_string(&new_manifest)?,
    )?;

    println!("Added the integrity zome {integrity_zome_name:?} and the coordinator zome {coordinator_zome_name:?} to {:?}.", nixified_dna.dna_manifest.0);

    Ok(())
}

fn get_or_choose_dna(
    file_tree: &FileTree,
    module_name: &String,
    local_dna_to_add_the_zome_to: Option<String>,
) -> Result<NixifiedDna, ScaffoldRemoteZomeError> {
    let nixified_dnas = find_nixified_dnas(&file_tree)?;

    match nixified_dnas.len() {
        0 => Err(ScaffoldRemoteZomeError::NoDnasFoundError)?,
        1 => {
            let nixified_dna = nixified_dnas.first().unwrap();
            if let Some(local_dna) = local_dna_to_add_the_zome_to {
                if !nixified_dna.name.eq(&local_dna) {
                    return Err(ScaffoldRemoteZomeError::NoDnasFoundError);
                }
            }
            Ok(nixified_dna.clone())
        }
        _ => {
            let dna_names: Vec<String> = nixified_dnas.iter().map(|dna| dna.name.clone()).collect();

            let dna_index = match local_dna_to_add_the_zome_to{
                Some(local_dna) => dna_names
                    .iter()
                    .position(|dna_name| dna_name.eq(&local_dna))
                    .ok_or(NpmScaffoldingUtilsError::NpmPackageNotFoundError(
                        local_dna.clone(),
                    ))?,
                None => {
                    Select::with_theme(&ColorfulTheme::default())
                    .with_prompt(format!("Multiple DNAs were found in this repository, choose one to scaffold the {module_name} zome into:",
                    ))
                    .default(0)
                    .items(&dna_names[..])
                    .interact()?},
            };

            let nixified_dna = &nixified_dnas[dna_index];
            Ok(nixified_dna.clone())
        }
    }
}

fn find_nixified_dnas(file_tree: &FileTree) -> Result<Vec<NixifiedDna>, ScaffoldRemoteZomeError> {
    // Find all dna.yaml files
    // Go through all nix files, finding `dnaManifest = `
    // For each DNA, find the ones that are referred to from the nix files, those are the eligible DNAs
    // Have the user select one of them
    // Add the zome in the DNA manifest
    // Add the zome in the nix file, in zomes = {
    let dna_manifest_re = Regex::new(r#"dnaManifest = (?<dnaManifestPath>./[^;]*);"#)?;

    let dna_yaml_files = find_files_by_name(file_tree, PathBuf::from("dna.yaml").as_path());

    let mut nixified_dnas: Vec<NixifiedDna> = Vec::new();

    let nix_files = find_files_by_extension(file_tree, "nix");

    for (dna_manifest_path, dna_manifest_content) in dna_yaml_files {
        let value: serde_yaml::Value = serde_yaml::from_str(dna_manifest_content.as_str())?;

        let serde_yaml::Value::Mapping(mapping) = value else {
            return Err(ScaffoldRemoteZomeError::MalformedDnaManifest(
                dna_manifest_path,
                String::from("root level object is not a mapping"),
            ));
        };

        let Some(serde_yaml::Value::String(dna_name)) = mapping.get("name") else {
            return Err(ScaffoldRemoteZomeError::MalformedDnaManifest(
                dna_manifest_path,
                String::from("manifest does not have a name"),
            ));
        };

        for (nix_file_path, nix_file_contents) in nix_files.iter() {
            if let Some(captures) = dna_manifest_re.captures(&nix_file_contents) {
                let capture = captures.name("dnaManifestPath").unwrap();
                let dna_manifest_path_in_nix_file = capture.as_str();

                let mut nix_file_folder = nix_file_path.clone();
                nix_file_folder.pop();

                let full_path = nix_file_folder.join(dna_manifest_path_in_nix_file).clean();

                if full_path.eq(&dna_manifest_path) {
                    nixified_dnas.push(NixifiedDna {
                        name: dna_name.clone(),
                        dna_nix: (nix_file_path.clone(), nix_file_contents.clone()),
                        dna_manifest: (dna_manifest_path.clone(), dna_manifest_content.clone()),
                        dna_manifest_reference_index: capture.start(),
                    });
                }
            }
        }
    }

    Ok(nixified_dnas)
}

#[cfg(test)]
mod tests {
    use super::*;
    use build_fs_tree::{dir, file};
    use file_tree_utils::file_content;

    #[test]
    fn multiple_package_test() {
        let repo: FileTree = dir! {
            "flake.nix" => file!(default_flake_nix()),
            "dna.nix" => file!(empty_dna_nix()),
            "workdir" => dir! {
                "dna.yaml" => file!(empty_dna_yaml("another_dna"))
            },
            "dna.yaml" => file!(empty_dna_yaml("mydna")),
            "package.json" => file!(empty_package_json("root")),
            "packages" => dir! {
                "package1" => dir! {
                    "package.json" => file!(empty_package_json("package1"))
                },
                "package2" => dir! {
                    "package.json" => file!(empty_package_json("package2"))
                }
            }
        };

        let repo = scaffold_remote_zome(
            repo,
            "profiles".into(),
            Some("profiles_integrity".into()),
            Some("profiles".into()),
            "github:holochain-open-dev/profiles".into(),
            Some("nixify".into()),
            "@holochain-open-dev/profiles".into(),
            PathBuf::from("ui"),
            None,
            Some("package1".into()),
        )
        .unwrap();

        assert_eq!(
            file_content(
                &repo,
                PathBuf::from("packages/package1/package.json").as_path()
            )
            .unwrap(),
            r#"{
  "name": "package1",
  "dependencies": {
    "@holochain-open-dev/profiles": "github:holochain-open-dev/profiles#nixify&path:ui"
  }
}"#
        );

        assert_eq!(
            file_content(&repo, PathBuf::from("dna.yaml").as_path()).unwrap(),
            r#"manifest_version: '1'
name: mydna
integrity:
  network_seed: null
  properties: null
  origin_time: 1709638576394039
  zomes:
  - name: profiles_integrity
    hash: null
    bundled: <NIX_PACKAGE>
    dependencies: null
    dylib: null
coordinator:
  zomes:
  - name: profiles
    hash: null
    bundled: <NIX_PACKAGE>
    dependencies:
    - name: profiles_integrity
    dylib: null
"#
        );

        assert_eq!(
            file_content(&repo, PathBuf::from("flake.nix").as_path()).unwrap(),
            r#"{
  description = "Template for Holochain app development";
  
  inputs = {
    profiles.url = "github:holochain-open-dev/profiles/nixify";
    nixpkgs.follows = "holochain/nixpkgs";

    versions.url = "github:holochain/holochain?dir=versions/weekly";

    holochain = {
      url = "github:holochain/holochain";
      inputs.versions.follows = "versions";
    };
    hc-infra.url = "github:holochain-open-dev/utils";
  };

  outputs = inputs @ { ... }:
    inputs.holochain.inputs.flake-parts.lib.mkFlake
    {
      inherit inputs;
      specialArgs = {
        rootPath = ./.;
      };
    }
    {
      imports = [
        ./dna.nix
      ];

      systems = builtins.attrNames inputs.holochain.devShells;
      perSystem =
        { inputs'
        , config
        , pkgs
        , system
        , lib
        , self'
        , ...
        }: {
          devShells.default = pkgs.mkShell {
            inputsFrom = [ 
              inputs'.hc-infra.devShells.synchronized-pnpm
              inputs'.holochain.devShells.holonix 
            ];
          };
        };
    };
}
"#
        );

        assert_eq!(
            file_content(&repo, PathBuf::from("dna.nix").as_path()).unwrap(),
            r#"{ inputs, ... }:

{
  perSystem =
    { inputs'
    , self'
    , ...
    }: {
  	  packages.my_dna = inputs.hc-infra.outputs.lib.dna {
        dnaManifest = ./dna.yaml;
        holochain = inputs'.holochain;
        zomes = {
          profiles_integrity = inputs'.profiles.packages.profiles_integrity;
          profiles = inputs'.profiles.packages.profiles;
        };
      };

  	  packages.another_dna = inputs.hc-infra.outputs.lib.dna {
        dnaManifest = ./workdir/dna.yaml;
        holochain = inputs'.holochain;
        zomes = {
        };
      };
    };
}
"#
        );
    }

    fn empty_package_json(package_name: &str) -> String {
        format!(
            r#"{{
  "name": "{package_name}",
  "dependencies": {{}}
}}
"#
        )
    }

    fn empty_dna_yaml(dna_name: &str) -> String {
        format!(
            r#"
---
manifest_version: "1"
name: {dna_name}
integrity:
  network_seed: ~
  properties: ~
  origin_time: 1709638576394039
  zomes: []
coordinator:
  zomes: []
"#
        )
    }

    fn default_flake_nix() -> String {
        String::from(
            r#"{
  description = "Template for Holochain app development";
  
  inputs = {
    nixpkgs.follows = "holochain/nixpkgs";

    versions.url = "github:holochain/holochain?dir=versions/weekly";

    holochain = {
      url = "github:holochain/holochain";
      inputs.versions.follows = "versions";
    };
    hc-infra.url = "github:holochain-open-dev/utils";
  };

  outputs = inputs @ { ... }:
    inputs.holochain.inputs.flake-parts.lib.mkFlake
    {
      inherit inputs;
      specialArgs = {
        rootPath = ./.;
      };
    }
    {
      imports = [
        ./dna.nix
      ];

      systems = builtins.attrNames inputs.holochain.devShells;
      perSystem =
        { inputs'
        , config
        , pkgs
        , system
        , lib
        , self'
        , ...
        }: {
          devShells.default = pkgs.mkShell {
            inputsFrom = [ 
              inputs'.hc-infra.devShells.synchronized-pnpm
              inputs'.holochain.devShells.holonix 
            ];
          };
        };
    };
}
"#,
        )
    }

    fn empty_dna_nix() -> String {
        String::from(
            r#"{ inputs, ... }:

{
  perSystem =
    { inputs'
    , self'
    , ...
    }: {
  	  packages.my_dna = inputs.hc-infra.outputs.lib.dna {
        dnaManifest = ./dna.yaml;
        holochain = inputs'.holochain;
        zomes = {
        };
      };

  	  packages.another_dna = inputs.hc-infra.outputs.lib.dna {
        dnaManifest = ./workdir/dna.yaml;
        holochain = inputs'.holochain;
        zomes = {
        };
      };
    };
}
"#,
        )
    }
}
