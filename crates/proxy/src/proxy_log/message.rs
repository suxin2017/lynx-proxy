use serde::{Deserialize, Serialize};

use crate::entities::request::Model;

use super::request_record::RequestRecord;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Message {
    add: Option<Model>,
    patch: Option<Model>,
}

impl Message {
    pub fn add(add: Model) -> Self {
        Self {
            add: Some(add),
            patch: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::entities::request::ModelBuilder;

    use super::*;

    #[test]
    #[ignore]
    fn message_serialize() {
        let json = serde_json::to_string(&Message::add(ModelBuilder::default().build().unwrap()));
        println!("{:?}", &json);
    }
}
