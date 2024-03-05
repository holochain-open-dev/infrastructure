use hdk::prelude::*;

#[hdk_extern]
pub fn hello(_: ()) -> ExternResult<String> {
    Ok(String::from("hello"))
}
