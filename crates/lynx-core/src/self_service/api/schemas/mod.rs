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
        "title": "RuleGroupFindParams",
        "type": "object",
        "properties": {
            "id": {
                "type": "number",
            },
        },
        "required": ["id"]
    })
});

pub static RULE_ADD_PARAMS_SCHEMA: Lazy<Value> = Lazy::new(|| {
    json!({
        "title": "RuleAddParams",
        "type": "object",
        "properties": {
            "name": {
                "type": "string",
            },
            "ruleGroupId": {
                "type": "number",
            }
        },
        "required": ["name","ruleGroupId"]
    })
});

pub static RULE_UPDATE_PARAMS_SCHEMA: Lazy<Value> = Lazy::new(|| {
    json!({
        "title": "RuleUpdateParams",
        "type": "object",
        "properties": {
            "name": {
                "type": "string",
            },
            "id": {
                "type": "number",
            },
            "content": {
                "type": "object",
            }   
        },
        "required": ["id"]
    })
});

pub static RULE_DELETE_PARAMS_SCHEMA: Lazy<Value> = Lazy::new(|| {
    json!({
        "title": "RuleDeleteParams",
        "type": "object",
        "properties": {
            "id": {
                "type": "number",
            },
        },
        "required": ["id"]
    })
});

pub static CHANGE_RECORDING_STATUS_PARAM_SCHEMA: Lazy<Value> = Lazy::new(|| {
    json!({
        "title": "changeRecordingStatusParams",
        "type": "object",
        "properties": {
            "status": {
                "type": "string",
            },
        },
        "required": ["status"]
    })
});

