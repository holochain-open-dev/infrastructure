use anyhow::Result;
use std::path::Path;

use parse_flake_lock::{FlakeLock, FlakeLockParseError};

use walkdir::WalkDir;

fn main() -> Result<()> {
    for entry in WalkDir::new(".").into_iter().filter_map(|e| e.ok()) {
        let f_name = entry.file_name().to_string_lossy();

        if f_name == "package.json" {
            println!("{}", f_name);
        }
    }

    Ok(())
}

// fn main() -> Result<(), FlakeLockParseError> {
//     let flake_lock = FlakeLock::new(Path::new("flake.lock"))?;

//     println!("asdf {flake_lock:?}");

//     Ok(())
// }
