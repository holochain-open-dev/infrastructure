use std::{collections::BTreeMap, path::PathBuf};

use convert_case::{Case, Casing};
use file_tree_utils::{
    file_content, find_files, flatten_file_tree, unflatten_file_tree, FileTree, FileTreeError,
};
use handlebars::{handlebars_helper, Handlebars};
use regex::Regex;
use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum TemplatesScaffoldingUtilsError {
    #[error(transparent)]
    HandlebarsRenderError(#[from] handlebars::RenderError),

    #[error("JSON serialization error: {0}")]
    SerdeJsonError(#[from] serde_json::Error),

    #[error(transparent)]
    HandlebarsTemplateError(#[from] handlebars::TemplateError),

    #[error(transparent)]
    FileTreeError(#[from] FileTreeError),
}

pub fn register_all_partials_in_dir<'a>(
    mut h: Handlebars<'a>,
    file_tree: &FileTree,
) -> Result<Handlebars<'a>, TemplatesScaffoldingUtilsError> {
    let partials = find_files(file_tree, &|path, _contents| {
        if let Some(e) = PathBuf::from(path).extension() {
            if e == "hbs" {
                return true;
            }
        }
        return false;
    });

    for (path, content) in partials {
        h.register_partial(
            path.with_extension("").as_os_str().to_str().unwrap(),
            content.trim(),
        )?;
    }

    Ok(h)
}

pub fn render_template_file<'a>(
    h: &Handlebars<'a>,
    existing_app_file_tree: &FileTree,
    target_path: &PathBuf,
    template_str: &String,
    value: &serde_json::Value,
) -> Result<String, TemplatesScaffoldingUtilsError> {
    let mut value = value.clone();

    if let Ok(previous_content) = file_content(existing_app_file_tree, &target_path) {
        value
            .as_object_mut()
            .unwrap()
            .insert("previous_file_content".into(), previous_content.into());
    }

    let mut h = h.clone();
    h.register_template_string(target_path.to_str().unwrap(), template_str)?;
    let new_contents = h.render(target_path.to_str().unwrap(), &value)?;

    Ok(new_contents)
}

pub fn render_template_file_tree<'a, T: Serialize>(
    existing_app_file_tree: &FileTree,
    h: &Handlebars<'a>,
    templates_file_tree: &FileTree,
    data: &T,
) -> Result<FileTree, TemplatesScaffoldingUtilsError> {
    let flattened_templates = flatten_file_tree(templates_file_tree);

    let mut transformed_templates: BTreeMap<PathBuf, Option<String>> = BTreeMap::new();

    let new_data = serde_json::to_string(data)?;
    let value: serde_json::Value = serde_json::from_str(new_data.as_str())?;

    for (path, maybe_contents) in flattened_templates {
        let path = PathBuf::from(path.to_str().unwrap().replace('¡', "/"));
        let path = PathBuf::from(path.to_str().unwrap().replace('\'', "\""));
        if let Some(contents) = maybe_contents {
            let re = Regex::new(
                r"(?P<c>(.)*)/\{\{#each (?P<b>([^\{\}])*)\}\}(?P<a>(.)*)\{\{/each\}\}.hbs\z",
            )
            .unwrap();
            let if_regex = Regex::new(
                r"(?P<c>(.)*)/\{\{#if (?P<b>([^\{\}])*)\}\}(?P<a>(.)*)\{\{/if\}\}.hbs\z",
            )
            .unwrap();

            if re.is_match(path.to_str().unwrap()) {
                let path_prefix = re.replace(path.to_str().unwrap(), "${c}");
                let path_prefix = h.render_template(path_prefix.to_string().as_str(), data)?;

                let new_path_suffix =
                    re.replace(path.to_str().unwrap(), "{{#each ${b} }}${a}.hbs{{/each}}");

                let all_paths = h.render_template(new_path_suffix.to_string().as_str(), data)?;

                let files_to_create: Vec<String> = all_paths
                    .split(".hbs")
                    .map(|s| s.to_string())
                    .filter(|s| !s.is_empty())
                    .collect();

                if files_to_create.len() > 0 {
                    let delimiter = "\n----END_OF_FILE_DELIMITER----\n";

                    let each_if_re = Regex::new(
                    r"(?P<c>(.)*)/\{\{#each (?P<b>([^\{\}])*)\}\}\{\{#if (?P<d>([^\{\}])*)\}\}(?P<a>(.)*)\{\{/if\}\}\{\{/each\}\}.hbs\z",
                )
                .unwrap();
                    let b = re.replace(path.to_str().unwrap(), "${b}");
                    let new_all_contents = match each_if_re.is_match(path.to_str().unwrap()) {
                        true => {
                            let d = each_if_re.replace(path.to_str().unwrap(), "${d}");
                            format!(
                                "{{{{#each {} }}}}{{{{#if {} }}}}\n{}{}{{{{/if}}}}{{{{/each}}}}",
                                b, d, contents, delimiter
                            )
                        }

                        false => format!(
                            "{{{{#each {} }}}}\n{}{}{{{{/each}}}}",
                            b, contents, delimiter
                        ),
                    };
                    let new_contents = render_template_file(
                        &h,
                        existing_app_file_tree,
                        &path,
                        &new_all_contents,
                        &value,
                    )?;
                    let new_contents_split: Vec<String> = new_contents
                        .split(delimiter)
                        .into_iter()
                        .map(|s| s.to_string())
                        .collect();

                    for (i, f) in files_to_create.into_iter().enumerate() {
                        let target_path = PathBuf::from(path_prefix.clone()).join(f);

                        transformed_templates
                            .insert(target_path, Some(new_contents_split[i].clone()));
                    }
                }
            } else if if_regex.is_match(path.to_str().unwrap()) {
                let path_prefix = if_regex.replace(path.to_str().unwrap(), "${c}");
                let path_prefix = h.render_template(path_prefix.to_string().as_str(), data)?;

                let new_path_suffix =
                    if_regex.replace(path.to_str().unwrap(), "{{#if ${b} }}${a}.hbs{{/if}}");

                let new_template = h.render_template(new_path_suffix.to_string().as_str(), data)?;

                if let Some(file_name) = new_template.strip_suffix(".hbs") {
                    let target_path = PathBuf::from(path_prefix.clone()).join(file_name);

                    let new_contents = render_template_file(
                        &h,
                        existing_app_file_tree,
                        &target_path,
                        &contents,
                        &value,
                    )?;
                    transformed_templates.insert(target_path, Some(new_contents));
                }
            } else if let Some(e) = path.extension() {
                if e == "hbs" {
                    let new_path = h.render_template(path.as_os_str().to_str().unwrap(), data)?;
                    let target_path = PathBuf::from(new_path).with_extension("");

                    let new_contents = render_template_file(
                        &h,
                        existing_app_file_tree,
                        &target_path,
                        &contents,
                        &value,
                    )?;

                    transformed_templates.insert(target_path, Some(new_contents));
                }
            }
        } else {
            let new_path = h.render_template(path.as_os_str().to_str().unwrap(), data)?;
            transformed_templates.insert(PathBuf::from(new_path), None);
        }
    }

    let file_tree = unflatten_file_tree(&transformed_templates)?;
    Ok(file_tree)
}

pub fn render_template_file_tree_and_merge_with_existing<'a, T: Serialize>(
    app_file_tree: FileTree,
    h: &Handlebars<'a>,
    template_file_tree: &FileTree,
    data: &T,
) -> Result<FileTree, TemplatesScaffoldingUtilsError> {
    let rendered_templates =
        render_template_file_tree(&app_file_tree, h, template_file_tree, data)?;

    let mut flattened_app_file_tree = flatten_file_tree(&app_file_tree);
    let flattened_templates = flatten_file_tree(&rendered_templates);

    flattened_app_file_tree.extend(flattened_templates);

    let file_tree = unflatten_file_tree(&flattened_app_file_tree)?;

    Ok(file_tree)
}

pub fn register_case_helpers<'a>(mut h: Handlebars<'a>) -> Handlebars<'a> {
    handlebars_helper!(title_case: |s: String| s.to_case(Case::Title));
    h.register_helper("title_case", Box::new(title_case));

    handlebars_helper!(lower_case: |s: String| s.to_case(Case::Lower));
    h.register_helper("lower_case", Box::new(lower_case));

    handlebars_helper!(snake_case: |s: String| s.to_case(Case::Snake));
    h.register_helper("snake_case", Box::new(snake_case));

    handlebars_helper!(kebab_case: |s: String| s.to_case(Case::Kebab));
    h.register_helper("kebab_case", Box::new(kebab_case));

    handlebars_helper!(camel_case: |s: String| s.to_case(Case::Camel));
    h.register_helper("camel_case", Box::new(camel_case));

    handlebars_helper!(pascal_case: |s: String| s.to_case(Case::Pascal));
    h.register_helper("pascal_case", Box::new(pascal_case));

    h
}
