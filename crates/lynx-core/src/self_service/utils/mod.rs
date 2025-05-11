use utoipa::{PartialSchema, ToSchema, TupleUnit};

#[derive(Debug, ToSchema, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ResponseCode {
    Ok,
    ValidateError,
}

#[derive(Debug, ToSchema, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResponseDataWrapper<T: PartialSchema> {
    pub code: ResponseCode,
    pub message: Option<String>,
    pub data: T,
}

pub fn ok<T: ToSchema>(data: T) -> ResponseDataWrapper<T> {
    ResponseDataWrapper {
        code: ResponseCode::Ok,
        message: None,
        data,
    }
}

#[derive(Debug, ToSchema, serde::Deserialize, serde::Serialize)]
pub struct EmptyOkResponse(ResponseDataWrapper<utoipa::TupleUnit>);

pub fn empty_ok() -> EmptyOkResponse {
    EmptyOkResponse(ResponseDataWrapper {
        code: ResponseCode::Ok,
        message: None,
        data: TupleUnit::default(),
    })
}

pub fn validate_error<T: serde::Serialize>(message: String) -> EmptyOkResponse {
    EmptyOkResponse(ResponseDataWrapper {
        code: ResponseCode::ValidateError,
        message: Some(message),
        data: TupleUnit::default(),
    })
}
