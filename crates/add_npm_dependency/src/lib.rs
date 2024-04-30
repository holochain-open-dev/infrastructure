use std::path::PathBuf;

use dialoguer::{theme::ColorfulTheme, Select};
use file_tree_utils::{find_files_by_name, map_file, FileTree, FileTreeError};
use serde_json::{Map, Value};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AddNpmDependencyError {
    #[error(transparent)]
    FileTreeError(#[from] FileTreeError),

    #[error(transparent)]
    DialoguerError(#[from] dialoguer::Error),

    #[error("No NPM packages were found in this file tree")]
    NoNpmPackagesFoundError,

    #[error("JSON serialization error: {0}")]
    SerdeJsonError(#[from] serde_json::Error),

    #[error("Malformed package.json {0}: {1}")]
    MalformedJsonError(PathBuf, String),

    #[error("NPM package not found: {0}")]
    NpmPackageNotFoundError(String),
}

fn default_select_npm_package(npm_packages: Vec<String>) -> Result<usize, AddNpmDependencyError> {
    Ok(Select::with_theme(&ColorfulTheme::default())
        .with_prompt("Multiple NPM packages were found in this repository, choose one:")
        .default(0)
        .items(&npm_packages[..])
        .interact()?)
}

pub fn add_npm_dependency(
    mut file_tree: FileTree,
    dependency: String,
    dependency_source: String,
    package_to_add_the_dependency_to: Option<String>,
    custom_select_npm_package: Option<
        Box<dyn Fn(Vec<String>) -> Result<usize, AddNpmDependencyError>>,
    >,
) -> Result<FileTree, AddNpmDependencyError> {
    let mut package_jsons = find_files_by_name(&file_tree, PathBuf::from("package.json").as_path());

    match package_jsons.len() {
        0 => Err(AddNpmDependencyError::NoNpmPackagesFoundError)?,
        1 => {
            let package_json = package_jsons.pop_first().unwrap();
            map_file(
                &mut file_tree,
                package_json.0.as_path(),
                |_package_json_content| {
                    add_npm_dependency_to_package(&package_json, &dependency, &dependency_source)
                },
            )?;
            println!("Added dependency {dependency} to {:?}.", package_json.0);
        }
        _ => {
            let package_jsons: Vec<(PathBuf, String)> = package_jsons.into_iter().collect();
            let packages_names = package_jsons
                .iter()
                .map(|package_json| get_npm_package_name(package_json))
                .collect::<Result<Vec<String>, AddNpmDependencyError>>()?;

            let package_index = match package_to_add_the_dependency_to {
                Some(package_to_add_to) => packages_names
                    .iter()
                    .position(|package_name| package_name.eq(&package_to_add_to))
                    .ok_or(AddNpmDependencyError::NpmPackageNotFoundError(
                        package_to_add_to.clone(),
                    ))?,
                None => match custom_select_npm_package {
                    Some(selector) => selector(packages_names)?,
                    None => default_select_npm_package(packages_names)?,
                },
            };

            let package_json = &package_jsons[package_index];

            map_file(
                &mut file_tree,
                package_json.0.as_path(),
                |_package_json_content| {
                    add_npm_dependency_to_package(package_json, &dependency, &dependency_source)
                },
            )?;
            println!("Added dependency {dependency} to {:?}.", package_json.0);
        }
    };

    Ok(file_tree)
}

fn get_npm_package_name(package_json: &(PathBuf, String)) -> Result<String, AddNpmDependencyError> {
    let json: serde_json::Value = serde_json::from_str(package_json.1.as_str())?;
    let Some(map) = json.as_object() else {
        return Err(AddNpmDependencyError::MalformedJsonError(
            package_json.0.to_path_buf(),
            String::from("package.json did not contain a json object at the root level"),
        ));
    };

    let Some(name) = map.get("name") else {
        return Err(AddNpmDependencyError::MalformedJsonError(
            package_json.0.to_path_buf(),
            String::from(r#"package.json did not contain a "name" property at the root level"#),
        ));
    };

    let Value::String(name) = name else {
        return Err(AddNpmDependencyError::MalformedJsonError(
            package_json.0.to_path_buf(),
            String::from(r#"the "name" property is not a string"#),
        ));
    };

    Ok(name.clone())
}

fn add_npm_dependency_to_package(
    package_json: &(PathBuf, String),
    dependency: &String,
    dependency_source: &String,
) -> Result<String, AddNpmDependencyError> {
    let mut json: serde_json::Value = serde_json::from_str(package_json.1.as_str())?;

    let Some(map) = json.as_object_mut() else {
        return Err(AddNpmDependencyError::MalformedJsonError(
            package_json.0.clone(),
            String::from("package.json did not contain a json object at the root level"),
        ));
    };

    let mut stub = serde_json::Value::Object(Map::new());

    let dependencies_value = map.get_mut("dependencies").unwrap_or(&mut stub);

    let Some(dependencies) = dependencies_value.as_object_mut() else {
        return Err(AddNpmDependencyError::MalformedJsonError(
            package_json.0.to_path_buf(),
            String::from(r#"the "dependencies" property is not a json object"#),
        ));
    };

    dependencies.insert(
        dependency.clone(),
        serde_json::Value::String(dependency_source.clone()),
    );

    Ok(serde_json::to_string_pretty(&json)?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use build_fs_tree::{dir, file};
    use file_tree_utils::file_content;

    #[test]
    fn single_package_test() {
        let repo: FileTree = dir! {
            "package.json" => file!(empty_package_json("single"))
        };

        let repo =
            add_npm_dependency(repo, "some-dep".into(), "some-url".into(), None, None).unwrap();

        assert_eq!(
            file_content(&repo, PathBuf::from("package.json").as_path()).unwrap(),
            r#"{
  "name": "single",
  "dependencies": {
    "some-dep": "some-url"
  }
}"#
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

    #[test]
    fn multiple_package_test() {
        let repo: FileTree = dir! {
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

        let repo = add_npm_dependency(
            repo,
            "some-dep".into(),
            "some-url".into(),
            Some(String::from("package1")),
            None,
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
    "some-dep": "some-url"
  }
}"#
        );
    }
}
