use std::path::PathBuf;

use file_tree_utils::{file_content, map_file, FileTree, FileTreeError};
use regex::{Captures, Regex};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum NixScaffoldingUtilsError {
    #[error(transparent)]
    RegexError(#[from] regex::Error),

    #[error(transparent)]
    FileTreeError(#[from] FileTreeError),

    #[error("flake.nix is malformed")]
    MalformedFlakeNixError,
}

pub fn add_flake_input(
    mut file_tree: FileTree,
    input_name: String,
    input_ref: String,
) -> Result<FileTree, NixScaffoldingUtilsError> {
    let flake_nix_path = PathBuf::from("flake.nix");
    let flake_nix_contents = file_content(&file_tree, flake_nix_path.as_path())?;
    let Ok(_root) = rnix::Root::parse(&flake_nix_contents).ok() else {
        return Err(NixScaffoldingUtilsError::MalformedFlakeNixError);
    };

    map_file(
        &mut file_tree,
        flake_nix_path.as_path(),
        |flake_nix_contents| {
            add_flake_input_to_flake_file(flake_nix_contents, input_name.clone(), input_ref.clone())
        },
    )?;

    println!("Added flake input {input_name} to flake.nix.");

    Ok(file_tree)
}

pub fn add_flake_input_to_flake_file(
    flake_nix: String,
    input_name: String,
    input_ref: String,
) -> Result<String, NixScaffoldingUtilsError> {
    let re = Regex::new(r"(?<before>.*)inputs(?<white1>\s*)=(?<white2>\s*)\{\n(?<after>.*)")?;

    if re.is_match(&flake_nix) {
        let new_flake_nix = re.replace(&flake_nix, |caps: &Captures| {
            format!(
                r#"{}inputs{}={}{{
    {input_name}.url = "{input_ref}";
{}"#,
                &caps["before"], &caps["white1"], &caps["white2"], &caps["after"],
            )
        });
        Ok(new_flake_nix.to_string())
    } else {
        Ok(format!(
            r#"{{
  inputs.{input_name}.url = "{input_ref}";
{}"#,
            flake_nix[2..].to_string()
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use build_fs_tree::{dir, file};

    #[test]
    fn add_flake_input_test() {
        let flake_contents = r#"{
  inputs = {
  };
  outputs = {};
}"#;
        let repo: FileTree = dir! {
            "flake.nix" => file!(flake_contents)
        };

        let file_tree =
            add_flake_input(repo, "someinput".to_string(), "someurl".to_string()).unwrap();

        assert_eq!(
            file_content(&file_tree, PathBuf::from("flake.nix").as_path()).unwrap(),
            r#"{
  inputs = {
    someinput.url = "someurl";
  };
  outputs = {};
}"#
        );
    }

    #[test]
    fn add_flake_input_inline_test() {
        let flake_contents = r#"{
  inputs.somefirstinput.url = "someurl";
  outputs = {};
}"#;

        let repo: FileTree = dir! {
            "flake.nix" => file!(flake_contents)
        };

        let file_tree =
            add_flake_input(repo, "someinput".to_string(), "someurl".to_string()).unwrap();

        assert_eq!(
            file_content(&file_tree, PathBuf::from("flake.nix").as_path()).unwrap(),
            r#"{
  inputs.someinput.url = "someurl";
  inputs.somefirstinput.url = "someurl";
  outputs = {};
}"#
        );
    }
}
