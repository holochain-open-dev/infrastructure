use file_tree_utils::FileTreeError;
use regex::{Captures, Regex};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AddFlakeInputError {
    #[error(transparent)]
    RegexError(#[from] regex::Error),

    #[error(transparent)]
    FileTreeError(#[from] FileTreeError),
}

pub fn add_flake_input(
    flake_nix: String,
    input_name: String,
    input_ref: String,
) -> Result<String, AddFlakeInputError> {
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

    #[test]
    fn add_flake_input_test() {
        let flake_contents = r#"{
  inputs = {
  };
  outputs = {};
}"#;

        assert_eq!(
            add_flake_input(
                flake_contents.to_string(),
                "someinput".to_string(),
                "someurl".to_string()
            )
            .unwrap(),
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

        assert_eq!(
            add_flake_input(
                flake_contents.to_string(),
                "someinput".to_string(),
                "someurl".to_string()
            )
            .unwrap(),
            r#"{
  inputs.someinput.url = "someurl";
  inputs.somefirstinput.url = "someurl";
  outputs = {};
}"#
        );
    }
}
