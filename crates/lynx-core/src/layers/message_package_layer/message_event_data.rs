use base64::{Engine as _, engine::general_purpose};
use bytes::Bytes;
use http::{HeaderMap, Request, Response, Version};
use http_body_util::{BodyExt, StreamBody};
use hyper::body::Body;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::warn;
use url::Url;
use utoipa::openapi::schema::Schema;
use utoipa::openapi::{KnownFormat, ObjectBuilder, RefOr, SchemaFormat, Type};
use utoipa::{PartialSchema, ToSchema};

use crate::common::BoxBody;

#[derive(Debug, Default, Deserialize, ToSchema, Serialize, Clone)]
pub struct MessageHeaderSize(pub usize);

pub trait ToHashMap {
    fn to_hash_map(&self) -> HashMap<String, String>;
}

impl ToHashMap for HeaderMap {
    fn to_hash_map(&self) -> HashMap<String, String> {
        self.iter()
            .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or_default().to_string()))
            .collect()
    }
}

pub trait ToStringVersion {
    fn to_string_version(&self) -> String;
}

impl ToStringVersion for Version {
    fn to_string_version(&self) -> String {
        match *self {
            Version::HTTP_09 => "HTTP/0.9".to_string(),
            Version::HTTP_10 => "HTTP/1.0".to_string(),
            Version::HTTP_11 => "HTTP/1.1".to_string(),
            Version::HTTP_2 => "HTTP/2.0".to_string(),
            Version::HTTP_3 => "HTTP/3.0".to_string(),
            _ => "Unknown".to_string(),
        }
    }
}

#[derive(Debug, Default, Deserialize, ToSchema, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MessageEventRequest {
    pub method: String,
    pub url: String,
    pub headers: HashMap<String, String>,
    pub version: String,
    pub header_size: MessageHeaderSize,
    pub body: MessageEventBody,
}

#[derive(Debug, Default, Deserialize, ToSchema, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MessageEventResponse {
    pub status: u16,
    pub headers: HashMap<String, String>,
    pub version: String,
    pub header_size: MessageHeaderSize,
    pub body: MessageEventBody,
}

#[derive(Debug, Default, Clone)]
pub struct MessageEventBody(Bytes);

impl MessageEventBody {
    pub fn new(bytes: Bytes) -> Self {
        MessageEventBody(bytes)
    }
}

impl PartialSchema for MessageEventBody {
    fn schema() -> utoipa::openapi::RefOr<utoipa::openapi::schema::Schema> {
        RefOr::T(Schema::Object(
            ObjectBuilder::new()
                .schema_type(Type::String)
                .format(Some(SchemaFormat::KnownFormat(KnownFormat::Byte)))
                .build(),
        ))
    }
}

impl ToSchema for MessageEventBody {}

impl Serialize for MessageEventBody {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let base64_encoded = general_purpose::STANDARD.encode(&self.0);
        serializer.serialize_str(&base64_encoded)
    }
}

impl<'de> Deserialize<'de> for MessageEventBody {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let base64_str = String::deserialize(deserializer)?;
        let decoded_bytes = general_purpose::STANDARD
            .decode(&base64_str)
            .map(Bytes::from)
            .map_err(serde::de::Error::custom)?;
        Ok(MessageEventBody(decoded_bytes))
    }
}

impl PartialEq for MessageEventBody {
    fn eq(&self, other: &Self) -> bool {
        self.0 == other.0
    }
}

impl Extend<u8> for MessageEventBody {
    fn extend<T: IntoIterator<Item = u8>>(&mut self, iter: T) {
        let mut bytes_vec = self.0.to_vec(); // Convert Bytes to Vec<u8>
        bytes_vec.extend(iter); // Extend the Vec<u8>
        self.0 = Bytes::from(bytes_vec); // Convert back to Bytes
    }
}

impl<B: Body> From<&Response<B>> for MessageEventResponse {
    fn from(res: &Response<B>) -> Self {
        let status = res.status().as_u16();
        let headers = res.headers().to_hash_map();
        let version = res.version().to_string_version();
        let header_size = MessageHeaderSize::from(res.headers().clone());
        let body = MessageEventBody(Bytes::new());

        MessageEventResponse {
            status,
            headers,
            version,
            header_size,
            body,
        }
    }
}

impl From<HeaderMap> for MessageHeaderSize {
    fn from(header_map: HeaderMap) -> Self {
        let header_size: usize = header_map
            .iter()
            .map(|(k, v)| k.as_str().len() + v.as_bytes().len())
            .sum();
        MessageHeaderSize(header_size)
    }
}

impl<B: Body> From<&Request<B>> for MessageEventRequest {
    fn from(req: &Request<B>) -> Self {
        let method = req.method().to_string();
        let url = Url::parse(&req.uri().to_string())
            .map(|url| url.to_string())
            .unwrap_or_default();
        let headers = req.headers().to_hash_map();
        let version = req.version().to_string_version();
        let header_size = MessageHeaderSize::from(req.headers().clone());
        let body = MessageEventBody(Bytes::new());

        MessageEventRequest {
            method,
            url,
            headers,
            version,
            header_size,
            body,
        }
    }
}

pub fn copy_body_stream(
    mut body: BoxBody,
) -> (
    tokio_stream::wrappers::ReceiverStream<bytes::Bytes>,
    BoxBody,
) {
    let (tx1, rx1) = tokio::sync::mpsc::channel::<bytes::Bytes>(100);
    let (tx2, rx2) = tokio::sync::mpsc::channel(100);

    tokio::spawn(async move {
        while let Some(frame) = body.frame().await {
            if let Ok(frame) = &frame {
                if let Some(data) = frame.data_ref() {
                    if tx1.send(data.clone()).await.is_err() {
                        warn!("Failed to send data");
                    }
                }
            }
            if tx2.send(frame).await.is_err() {
                warn!("Failed to send frame");
                break;
            }
        }
    });
    let new_data_stream = tokio_stream::wrappers::ReceiverStream::new(rx1);
    let old_body = tokio_stream::wrappers::ReceiverStream::new(rx2);
    let old_body: BoxBody = BodyExt::boxed(StreamBody::new(old_body));

    (new_data_stream, old_body)
}

#[cfg(test)]
mod tests {

    use bytes::{Bytes, BytesMut};
    use futures_util::StreamExt;
    use http::Request;
    use http_body_util::BodyExt;

    use crate::utils::full;

    use super::*;

    fn vec_to_bytes(vec: &[Bytes]) -> Bytes {
        let mut bytes_mut = BytesMut::new();

        for b in vec {
            bytes_mut.extend_from_slice(b);
        }

        bytes_mut.freeze()
    }

    #[tokio::test]
    async fn copy_body_test() {
        let test_body = full("test");

        let (data_stream, frame_stream) = copy_body_stream(test_body);
        let data: Vec<Bytes> = data_stream.collect().await;
        let collected_data: Bytes = vec_to_bytes(&data);
        let extracted_data = frame_stream
            .collect()
            .await
            .expect("Failed to collect frames")
            .to_bytes();

        assert_eq!(collected_data, extracted_data);
    }

    #[tokio::test]
    async fn test_message_event_request_from_req() {
        let req = Request::builder()
            .method("POST")
            .uri("http://example.com")
            .header("Content-Type", "application/json")
            .body(full("test body"))
            .unwrap();

        let message_event_request: MessageEventRequest = MessageEventRequest::from(&req);

        assert_eq!(message_event_request.method, "POST");
        assert_eq!(message_event_request.url, "http://example.com/");
        assert_eq!(
            message_event_request.headers.get("Content-Type").unwrap(),
            "application/json"
        );
        assert_eq!(message_event_request.body, MessageEventBody(Bytes::new()));
    }

    #[tokio::test]
    async fn test_message_header_size_from_header_map() {
        let mut header_map = HeaderMap::new();
        header_map.insert("Content-Type", "application/json".parse().unwrap());
        header_map.insert("Authorization", "Bearer token".parse().unwrap());

        let header_size = MessageHeaderSize::from(header_map);

        assert_eq!(
            header_size.0,
            "Content-Type".len()
                + "application/json".len()
                + "Authorization".len()
                + "Bearer token".len()
        );
    }
}
