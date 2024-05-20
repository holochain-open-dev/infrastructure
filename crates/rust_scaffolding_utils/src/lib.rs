use std::path::PathBuf;

use dialoguer::{theme::ColorfulTheme, Select};
use file_tree_utils::{
    file_content, file_exists, find_files_by_name, map_file, FileTree, FileTreeError,
};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum RustScaffoldingUtilsError {
    #[error(transparent)]
    FileTreeError(#[from] FileTreeError),

    #[error(transparent)]
    DialoguerError(#[from] dialoguer::Error),

    #[error("TOML deserialization error: {0}")]
    TomlDeError(#[from] toml::de::Error),

    #[error("TOML serialization error: {0}")]
    TomlSerError(#[from] toml::ser::Error),

    #[error("Malformed Cargo.toml {0}: {1}")]
    MalformedCargoTomlError(PathBuf, String),
}

pub fn add_member_to_workspace(
    cargo_toml: &(PathBuf, String),
    new_workspace_member: String,
) -> Result<String, RustScaffoldingUtilsError> {
    let mut workspace_cargo_toml: toml::Value = toml::from_str(cargo_toml.1.as_str())?;

    let workspace_table = workspace_cargo_toml
        .as_table_mut()
        .ok_or(RustScaffoldingUtilsError::MalformedCargoTomlError(
            cargo_toml.0.clone(),
            String::from("file does not conform to toml"),
        ))?
        .get_mut("workspace")
        .ok_or(RustScaffoldingUtilsError::MalformedCargoTomlError(
            cargo_toml.0.clone(),
            String::from("no workspace table found in workspace root"),
        ))?
        .as_table_mut()
        .ok_or(RustScaffoldingUtilsError::MalformedCargoTomlError(
            cargo_toml.0.clone(),
            String::from("workspace key is not a table"),
        ))?;

    let members = workspace_table
        .get_mut("members")
        .ok_or(RustScaffoldingUtilsError::MalformedCargoTomlError(
            cargo_toml.0.clone(),
            String::from("should have a members field in the workspace table"),
        ))?
        .as_array_mut()
        .ok_or(RustScaffoldingUtilsError::MalformedCargoTomlError(
            cargo_toml.0.clone(),
            String::from("the members field in the workspace table should be an array"),
        ))?;

    members.push(toml::Value::String(new_workspace_member));

    let cargo_toml_str = toml::to_string(&workspace_cargo_toml)?;

    Ok(cargo_toml_str)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn add_member_to_workspace_test() {
        let cargo_toml = r#"[workspace]
members = ["tauri-plugin-holochain", "crates/*"]
resolver = "2"
"#;
        assert_eq!(
            add_member_to_workspace(
                &(PathBuf::from("/"), cargo_toml.to_string()),
                String::from("src-tauri")
            )
            .unwrap(),
            r#"[workspace]
members = ["tauri-plugin-holochain", "crates/*", "src-tauri"]
resolver = "2"
"#
        );
    }
}
