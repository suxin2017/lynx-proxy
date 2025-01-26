use serde::{Deserialize, Serialize};

use crate::entities::request::Model;

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
