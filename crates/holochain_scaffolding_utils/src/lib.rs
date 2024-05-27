use std::{collections::BTreeMap, path::PathBuf};

use dialoguer::{theme::ColorfulTheme, Select};
use file_tree_utils::{find_files_by_name, FileTree, FileTreeError};
use holochain_types::{app::AppManifest, web_app::WebAppManifest};
use mr_bundle::Manifest;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum Error {
    #[error(transparent)]
    FileTreeError(#[from] FileTreeError),

    #[error(transparent)]
    DialoguerError(#[from] dialoguer::Error),

    #[error(transparent)]
    SerdeYamlError(#[from] serde_yaml::Error),

    #[error("No web-happ.yaml files were found in this repository")]
    WebAppManifestNotFound,

    #[error("No happ.yaml files were found in this repository")]
    AppManifestNotFound,
}

pub fn get_or_choose_web_app_manifest(
    file_tree: &FileTree,
) -> Result<(PathBuf, WebAppManifest), Error> {
    let web_app_manifests = find_web_app_manifests(&file_tree)?;

    let app_manifest = match web_app_manifests.len() {
        0 => Err(Error::WebAppManifestNotFound),
        1 => web_app_manifests
            .into_iter()
            .last()
            .ok_or(Error::WebAppManifestNotFound),
        _ => choose_web_app(web_app_manifests),
    }?;

    Ok(app_manifest)
}

pub fn choose_web_app(
    app_manifests: BTreeMap<PathBuf, WebAppManifest>,
) -> Result<(PathBuf, WebAppManifest), Error> {
    let manifest_vec: Vec<(PathBuf, WebAppManifest)> = app_manifests.into_iter().collect();
    let app_names: Vec<String> = manifest_vec
        .iter()
        .map(|(_, m)| m.app_name().to_string())
        .collect();

    let selection = Select::with_theme(&ColorfulTheme::default())
        .with_prompt("Multiple web-happs were found in this repository, choose one:")
        .default(0)
        .items(&app_names[..])
        .interact()?;

    Ok(manifest_vec[selection].clone())
}

/// Returns the path to the existing app manifests in the given project structure
pub fn find_web_app_manifests(
    app_file_tree: &FileTree,
) -> Result<BTreeMap<PathBuf, WebAppManifest>, Error> {
    let files = find_files_by_name(app_file_tree, &WebAppManifest::path());

    let manifests: BTreeMap<PathBuf, WebAppManifest> = files
        .into_iter()
        .map(|(key, manifest_str)| {
            let manifest: WebAppManifest = serde_yaml::from_str(manifest_str.as_str())?;
            Ok((key, manifest))
        })
        .collect::<serde_yaml::Result<Vec<(PathBuf, WebAppManifest)>>>()?
        .into_iter()
        .collect();

    Ok(manifests)
}

pub fn get_or_choose_app_manifest(file_tree: &FileTree) -> Result<(PathBuf, AppManifest), Error> {
    let app_manifests = find_app_manifests(&file_tree)?;

    let app_manifest = match app_manifests.len() {
        0 => Err(Error::AppManifestNotFound),
        1 => app_manifests
            .into_iter()
            .last()
            .ok_or(Error::AppManifestNotFound),
        _ => choose_app(app_manifests),
    }?;

    Ok(app_manifest)
}

pub fn choose_app(
    app_manifests: BTreeMap<PathBuf, AppManifest>,
) -> Result<(PathBuf, AppManifest), Error> {
    let manifest_vec: Vec<(PathBuf, AppManifest)> = app_manifests.into_iter().collect();
    let app_names: Vec<String> = manifest_vec
        .iter()
        .map(|(_, m)| m.app_name().to_string())
        .collect();

    let selection = Select::with_theme(&ColorfulTheme::default())
        .with_prompt("Multiple happs were found in this repository, choose one:")
        .default(0)
        .items(&app_names[..])
        .interact()?;

    Ok(manifest_vec[selection].clone())
}

/// Returns the path to the existing app manifests in the given project structure
pub fn find_app_manifests(
    app_file_tree: &FileTree,
) -> Result<BTreeMap<PathBuf, AppManifest>, Error> {
    let files = find_files_by_name(app_file_tree, &AppManifest::path());

    let manifests: BTreeMap<PathBuf, AppManifest> = files
        .into_iter()
        .map(|(key, manifest_str)| {
            let manifest: AppManifest = serde_yaml::from_str(manifest_str.as_str())?;
            Ok((key, manifest))
        })
        .collect::<serde_yaml::Result<Vec<(PathBuf, AppManifest)>>>()?
        .into_iter()
        .collect();

    Ok(manifests)
}
