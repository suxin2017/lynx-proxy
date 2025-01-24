use serde::{Deserialize, Serialize};

use super::request_record::RequestRecord;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Message {
    Add(RequestRecord),
    Patch(RequestRecord),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore]
    fn message_serialize() {
        let json = serde_json::to_string(&Message::Add(RequestRecord::default()));
        println!("{:?}", &json);
    }
}
