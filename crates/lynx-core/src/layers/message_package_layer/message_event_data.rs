use bytes::{Bytes, BytesMut};
use http::{HeaderMap, Version};
use http_body_util::{BodyExt, StreamBody};
use serde::{Deserialize, Serialize};
use tracing::warn;
use url::Url;

use crate::common::{BoxBody, Req};


#[derive(Debug, Default, Deserialize, Serialize)]
pub struct MessageHeaderSize(pub usize);

#[derive(Debug, Default, Deserialize, Serialize)]
pub struct MessageEventRequest {
    pub method: String,
    pub url: String,
    #[serde(with = "http_serde::header_map")]
    pub headers: HeaderMap,
    #[serde(with = "http_serde::version")]
    pub version: Version,
    pub header_size: MessageHeaderSize,
    #[serde(with = "serde_bytes")]
    pub body: Vec<u8>,
}

#[derive(Debug, Default, Deserialize, Serialize)]
pub struct MessageEventResponse {}

impl From<HeaderMap> for MessageHeaderSize {
    fn from(header_map: HeaderMap) -> Self {
        let header_size: usize = header_map
            .iter()
            .map(|(k, v)| k.as_str().len() + v.as_bytes().len())
            .sum();
        MessageHeaderSize(header_size)
    }
}

impl From<Req> for MessageEventRequest {
    fn from(req: Req) -> Self {
        let method = req.method().to_string();
        let url = Url::parse(&req.uri().to_string())
            .map(|url| url.to_string())
            .unwrap_or_default();
        let headers = req.headers().clone();
        let version = req.version();
        let header_size = MessageHeaderSize::from(req.headers().clone());
        let body = Vec::new();

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

fn copy_body_stream(
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

fn vec_to_bytes(vec: &Vec<Bytes>) -> Bytes {
    let mut bytes_mut = BytesMut::new();

    for b in vec {
        bytes_mut.extend_from_slice(b);
    }

    bytes_mut.freeze()
}

#[cfg(test)]
mod tests {

    use bytes::Bytes;
    use futures_util::StreamExt;
    use http::Request;
    use http_body_util::BodyExt;

    use crate::utils::full;

    use super::*;

    #[tokio::test]
    async fn copy_body_test() {
        let test_body = full("test");

        let (data_stream, frame_stream) = copy_body_stream(test_body);
        let data = data_stream.collect().await;
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

        let message_event_request: MessageEventRequest = req.into();

        assert_eq!(message_event_request.method, "POST");
        assert_eq!(message_event_request.url, "http://example.com/");
        assert_eq!(
            message_event_request.headers.get("Content-Type").unwrap(),
            "application/json"
        );
        assert_eq!(message_event_request.body, Vec::<u8>::new());
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
