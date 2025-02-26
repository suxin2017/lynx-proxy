use std::fmt::Display;

use anyhow::anyhow;
use schemars::{JsonSchema, schema_for};
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Serialize, Deserialize, JsonSchema)]
#[schemars(example = "example_my_struct")]
struct MyStruct {
    #[schemars(description = "The name of the person.")]
    name: String,

    #[schemars(description = "The age of the person.")]
    age: u32,

    /// # is human
    /// desc
    /// i can write anything here
    is_human: bool,
}

fn example_my_struct() -> MyStruct {
    MyStruct {
        name: "John Doe".to_string(),
        age: 30,
        is_human: true,
    }
}
#[derive(Debug, Deserialize, Serialize)]
struct ValidateError {
    message: String,
}

impl Display for ValidateError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "ValidateError: {}", self.message)
    }
}

#[tokio::main]
async fn main() {
    let schema = schema_for!(MyStruct);
    let schema = serde_json::to_value(&schema).unwrap();

    let instance = json!({});
    println!("{}", serde_json::to_string_pretty(&schema).unwrap());

    let res = jsonschema::validate(&schema, &instance);

    match res {
        Ok(_) => println!("Valid"),
        Err(e) => {
            let message = format!("{}", e);
            println!("Invalid: {}", message);
            let err = anyhow!(ValidateError { message });

            let validate_err = err.downcast::<ValidateError>();

            match validate_err {
                Ok(err) => println!("Error: {}", err.message),
                Err(_) => println!("Error: Unknown"),
            }
        }
    }
}
