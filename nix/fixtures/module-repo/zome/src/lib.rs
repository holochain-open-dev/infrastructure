use hdk::prelude::*;

#[hdk_extern]
pub fn hello(_: ()) -> ExternResult<String> {
    let e = wasm_error!(WasmErrorInner::Guest(String::from("hi")));
    Ok(format!("hello {e:?}"))
}
