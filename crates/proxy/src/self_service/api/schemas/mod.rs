use once_cell::sync::Lazy;

use serde_json::{json, Value};

pub static RULE_GROUP_ADD_PARAMS_SCHEMA: Lazy<Value> = Lazy::new(|| {
    json!({
        "title": "RuleGroupAddParams",
        "type": "object",
        "properties": {
            "name": {
                "type": "string",
            },
            "description": {
                "type": "string"
            }
        },
        "required": ["name"]
    })
});

pub static RULE_GROUP_UPDATE_PARAMS_SCHEMA: Lazy<Value> = Lazy::new(|| {
    json!({
        "title": "RuleGroupAddParams",
        "type": "object",
        "properties": {
            "name": {
                "type": "string",
            },
            "description": {
                "type": "string"
            }
        },
        "required": ["name"]
    })
});

pub static RULE_GROUP_DELETE_PARAMS_SCHEMA: Lazy<Value> = Lazy::new(|| {
    json!({
        "title": "RuleGroupDeleteParams",
        "type": "object",
        "properties": {
            "id": {
                "type": "number",
            },
        },
        "required": ["id"]
    })
});

pub static RULE_GROUP_FIND_PARAMS_SCHEMA: Lazy<Value> = Lazy::new(|| {
    json!({
        "title": "RuleGroupAddParams",
        "type": "object",
        "properties": {
            "id": {
                "type": "number",
            },
        },
        "required": ["id"]
    })
});
