use anyhow::Result;
use colored::Colorize;
use std::process::ExitCode;

fn main() -> ExitCode {
    if let Err(err) = internal_main() {
        eprintln!("{}", format!("Error: {err:?}").red());
        return ExitCode::FAILURE;
    }
    ExitCode::SUCCESS
}

fn internal_main() -> Result<()> {
    sync_npm_git_dependencies_with_nix::synchronize_npm_git_dependencies_with_nix()?;

    Ok(())
}
