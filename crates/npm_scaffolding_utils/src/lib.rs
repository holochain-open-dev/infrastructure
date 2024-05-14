use std::path::PathBuf;

use dialoguer::{theme::ColorfulTheme, Select};
use file_tree_utils::{find_files_by_name, map_file, FileTree, FileTreeError, file_exists, file_content};
use serde_json::{Map, Value};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum NpmScaffoldingUtilsError {
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

fn default_select_npm_package(
    npm_packages: Vec<String>,
) -> Result<usize, NpmScaffoldingUtilsError> {
    Ok(Select::with_theme(&ColorfulTheme::default())
        .with_prompt("Multiple NPM packages were found in this repository, choose one:")
        .default(0)
        .items(&npm_packages[..])
        .interact()?)
}

pub fn choose_npm_package(file_tree: &FileTree, prompt: &String) -> Result<String, NpmScaffoldingUtilsError> {
    let package_jsons = find_files_by_name(&file_tree, PathBuf::from("package.json").as_path());

    let package_jsons: Vec<(PathBuf, String)> = package_jsons.into_iter().collect();
    let packages_names = package_jsons
        .iter()
        .map(|package_json| get_npm_package_name(package_json))
        .collect::<Result<Vec<String>, NpmScaffoldingUtilsError>>()?;
    
    let index = Select::with_theme(&ColorfulTheme::default())
        .with_prompt(prompt)
        .default(0)
        .items(&packages_names[..])
        .interact()?;

    Ok(packages_names[index].clone())
}

pub fn add_npm_dependency(
    mut file_tree: FileTree,
    dependency: String,
    dependency_source: String,
    package_to_add_the_dependency_to: Option<String>,
    custom_select_npm_package: Option<
        Box<dyn Fn(Vec<String>) -> Result<usize, NpmScaffoldingUtilsError>>,
    >,
) -> Result<FileTree, NpmScaffoldingUtilsError> {
    let mut package_jsons = find_files_by_name(&file_tree, PathBuf::from("package.json").as_path());

    match package_jsons.len() {
        0 => Err(NpmScaffoldingUtilsError::NoNpmPackagesFoundError)?,
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
                .collect::<Result<Vec<String>, NpmScaffoldingUtilsError>>()?;

            let package_index = match package_to_add_the_dependency_to {
                Some(package_to_add_to) => packages_names
                    .iter()
                    .position(|package_name| package_name.eq(&package_to_add_to))
                    .ok_or(NpmScaffoldingUtilsError::NpmPackageNotFoundError(
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

fn get_npm_package_name(
    package_json: &(PathBuf, String),
) -> Result<String, NpmScaffoldingUtilsError> {
    let json: serde_json::Value = serde_json::from_str(package_json.1.as_str())?;
    let Some(map) = json.as_object() else {
        return Err(NpmScaffoldingUtilsError::MalformedJsonError(
            package_json.0.to_path_buf(),
            String::from("package.json did not contain a json object at the root level"),
        ));
    };

    let Some(name) = map.get("name") else {
        return Err(NpmScaffoldingUtilsError::MalformedJsonError(
            package_json.0.to_path_buf(),
            String::from(r#"package.json did not contain a "name" property at the root level"#),
        ));
    };

    let Value::String(name) = name else {
        return Err(NpmScaffoldingUtilsError::MalformedJsonError(
            package_json.0.to_path_buf(),
            String::from(r#"the "name" property is not a string"#),
        ));
    };

    Ok(name.clone())
}

pub fn add_npm_dependency_to_package(
    package_json: &(PathBuf, String),
    dependency: &String,
    dependency_source: &String,
) -> Result<String, NpmScaffoldingUtilsError> {
    let mut json: serde_json::Value = serde_json::from_str(package_json.1.as_str())?;

    let Some(map) = json.as_object_mut() else {
        return Err(NpmScaffoldingUtilsError::MalformedJsonError(
            package_json.0.clone(),
            String::from("package.json did not contain a json object at the root level"),
        ));
    };

    let mut stub = serde_json::Value::Object(Map::new());

    let dependencies_value = map.get_mut("dependencies").unwrap_or(&mut stub);

    let Some(dependencies) = dependencies_value.as_object_mut() else {
        return Err(NpmScaffoldingUtilsError::MalformedJsonError(
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

pub fn add_npm_dev_dependency_to_package(
    package_json: &(PathBuf, String),
    dev_dependency: &String,
    dev_dependency_source: &String,
) -> Result<String, NpmScaffoldingUtilsError> {
    let mut json: serde_json::Value = serde_json::from_str(package_json.1.as_str())?;

    let Some(map) = json.as_object_mut() else {
        return Err(NpmScaffoldingUtilsError::MalformedJsonError(
            package_json.0.clone(),
            String::from("package.json did not contain a json object at the root level"),
        ));
    };

    if !map.contains_key("devDependencies") {
        let stub = serde_json::Value::Object(Map::new());
        map.insert("devDependencies".into(), stub);
    }

    let dependencies_value = map.get_mut("devDependencies").unwrap();

    let Some(dependencies) = dependencies_value.as_object_mut() else {
        return Err(NpmScaffoldingUtilsError::MalformedJsonError(
            package_json.0.to_path_buf(),
            String::from(r#"the "devDependencies" property is not a json object"#),
        ));
    };

    dependencies.insert(
        dev_dependency.clone(),
        serde_json::Value::String(dev_dependency_source.clone()),
    );

    Ok(serde_json::to_string_pretty(&json)?)
}

pub fn add_npm_script_to_package(
    package_json: &(PathBuf, String),
    script_name: &String,
    script: &String,
) -> Result<String, NpmScaffoldingUtilsError> {
    let mut json: serde_json::Value = serde_json::from_str(package_json.1.as_str())?;

    let Some(map) = json.as_object_mut() else {
        return Err(NpmScaffoldingUtilsError::MalformedJsonError(
            package_json.0.clone(),
            String::from("package.json did not contain a json object at the root level"),
        ));
    };

    if !map.contains_key("scripts") {
        let stub = serde_json::Value::Object(Map::new());
        map.insert("scripts".into(), stub);
    }

    let scripts_value = map.get_mut("scripts").unwrap();

    let Some(scripts) = scripts_value.as_object_mut() else {
        return Err(NpmScaffoldingUtilsError::MalformedJsonError(
            package_json.0.to_path_buf(),
            String::from(r#"The "scripts" property is not a json object"#),
        ));
    };

    scripts.insert(
        script_name.clone(),
        serde_json::Value::String(script.clone()),
    );

    Ok(serde_json::to_string_pretty(&json)?)
}

pub fn get_name_of_root_package(file_tree: &FileTree) -> Result<String, NpmScaffoldingUtilsError> {
    let root_package_json_path = PathBuf::from("package.json");
    let content = file_content(file_tree, root_package_json_path.as_path())?;

    let mut json: serde_json::Value = serde_json::from_str(content.as_str())?;

    let Some(map) = json.as_object_mut() else {
        return Err(NpmScaffoldingUtilsError::MalformedJsonError(
            root_package_json_path,
            String::from("package.json did not file_contentcontain a json object at the root level"),
        ));
    };
    let Some(Value::String(name)) = map.get("name") else {
        return Err(NpmScaffoldingUtilsError::MalformedJsonError(
            root_package_json_path,
            String::from("package.json did not file_contentcontain a name field at the root level"),
        ));
    };

    Ok(name.clone())
}

#[derive(Debug,Clone, Copy)]
pub enum PackageManager {
	Npm,
	Pnpm,
	Yarn
}
impl ToString for PackageManager {
	fn to_string(&self) -> String {
      format!("{self:?}")
  }
}

impl PackageManager {
	pub fn all_package_managers() -> Vec<PackageManager> {
		vec![PackageManager::Npm, PackageManager::Pnpm, PackageManager::Yarn]
	}
	pub fn run_script_command(&self, script: String, workspace: Option<String>) -> String {
		let workspace_selection = match workspace {
			None => format!(""),
			Some(workspace_name) => match self {
				PackageManager::Npm => format!(" -w {workspace_name}"),
				PackageManager::Pnpm => format!(" -F {workspace_name}"),
				PackageManager::Yarn => format!(" -w {workspace_name}"),
			}
		};
		match self {
			PackageManager::Npm => format!("npm run{workspace_selection} {script}"),
			PackageManager::Pnpm => format!("pnpm{workspace_selection} {script}"),
			PackageManager::Yarn=> format!("yarn{workspace_selection} {script}")
		}
	}
}

pub fn guess_or_choose_package_manager(file_tree: &FileTree) -> Result<PackageManager, NpmScaffoldingUtilsError> {
	if file_exists(&file_tree, PathBuf::from("package-lock.json").as_path()) {
		return Ok(PackageManager::Npm);
	}
	if file_exists(&file_tree, PathBuf::from("pnpm-lock.yaml").as_path()) {
		return Ok(PackageManager::Pnpm);
	}
	if file_exists(&file_tree, PathBuf::from("yarn.lock").as_path()) {
		return Ok(PackageManager::Yarn);
	}
let package_managers = PackageManager::all_package_managers();
	
    let index = Select::with_theme(&ColorfulTheme::default())
        .with_prompt(
        format!(    
"Could not guess which package manager you are using for this app. Please select the package manager you are using:"))
        .items(&package_managers[..])
        .interact()?;

      Ok(package_managers[index])
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

    #[test]
    fn single_package_dev_dependency_test() {
        let content =
            add_npm_dev_dependency_to_package(&(PathBuf::from("package.json"),empty_package_json("single")), &String::from("some-dep"), &String::from("some-url")) .unwrap();

        assert_eq!(
            content,
            r#"{
  "name": "single",
  "dependencies": {},
  "devDependencies": {
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
