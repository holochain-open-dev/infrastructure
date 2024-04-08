use add_flake_input::{add_flake_input, AddFlakeInputError};
use add_npm_dependency::{add_npm_dependency, AddNpmDependencyError};
use anyhow::Result;
use file_tree_utils::{file_content, map_file, FileTree, FileTreeError};
use std::path::PathBuf;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ScaffoldRemoteZomeError {
    #[error(transparent)]
    AddNpmDependencyError(#[from] AddNpmDependencyError),

    #[error(transparent)]
    AddFlakeInputError(#[from] AddFlakeInputError),

    #[error(transparent)]
    FileTreeError(#[from] FileTreeError),
}

pub fn scaffold_remote_zome(
    mut file_tree: FileTree,
    zome_name: String,
    remote_zome_git_url: String,
    remote_npm_package_name: String,
    remote_npm_package_path: PathBuf,
    local_npm_package_to_add_the_dependency_to: Option<String>,
) -> Result<FileTree, ScaffoldRemoteZomeError> {
    map_file(
        &mut file_tree,
        PathBuf::from("flake.nix").as_path(),
        |flake_nix| add_flake_input(flake_nix, zome_name.clone(), remote_zome_git_url.clone()),
    )?;

    let npm_dependency_source = format!(
        "{remote_zome_git_url}?path:{}",
        remote_npm_package_path.to_str().unwrap()
    );

    let file_tree = add_npm_dependency(file_tree, remote_npm_package_name, npm_dependency_source, local_npm_package_to_add_the_dependency_to, Some(format!("Multiple NPM packages were found in this repository, choose one to add the UI package for the {zome_name} zome:")))?;

    Ok(file_tree)
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
            "github:holochain-open-dev/profiles".into(),
            "@holochain-open-dev/profiles".into(),
            PathBuf::from("./ui"),
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
    "@holochain-open-dev/profiles": "github:holochain-open-dev/profiles?path:./ui"
  }
}"#
        );

        assert_eq!(
            file_content(&repo, PathBuf::from("flake.nix").as_path()).unwrap(),
            r#"{
  description = "Template for Holochain app development";
  
  inputs = {
    profiles.url = "github:holochain-open-dev/profiles";
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
        ./happ/happ.nix
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
        ./happ/happ.nix
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
}
