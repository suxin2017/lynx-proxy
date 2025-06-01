use anyhow::Result;
use http::{Method, Uri};
use http_body_util::{BodyExt, Full};
use lynx_db::dao::request_processing_dao::handlers::ModifyRequestConfig;

use super::handler_trait::{HandleRequestType, HandlerTrait};
use crate::common::Req;

#[async_trait::async_trait]
impl HandlerTrait for ModifyRequestConfig {
    async fn handle_request(&self, mut request: Req) -> Result<HandleRequestType> {
        // Modify headers if specified
        if let Some(ref modify_headers) = self.modify_headers {
            let headers = request.headers_mut();
            for (key, value) in modify_headers {
                if let (Ok(header_name), Ok(header_value)) = (
                    key.parse::<http::HeaderName>(),
                    value.parse::<http::HeaderValue>(),
                ) {
                    headers.insert(header_name, header_value);
                }
            }
        }

        // Modify method if specified
        if let Some(ref new_method) = self.modify_method {
            if let Ok(method) = new_method.parse::<Method>() {
                *request.method_mut() = method;
            }
        }

        // Modify URL if specified
        if let Some(ref new_url) = self.modify_url {
            if let Ok(uri) = new_url.parse::<Uri>() {
                let new_uri = uri.into_parts();
                let old_uri = request.uri_mut();
                let mut url_builder = Uri::builder();
                if let Some(schema) = new_uri.scheme.or(old_uri.scheme().cloned()) {
                    url_builder = url_builder.scheme(schema);
                }
                if let Some(authority) = new_uri.authority.or(old_uri.authority().cloned()) {
                    url_builder = url_builder.authority(authority);
                }
                if let Some(path_and_query) =
                    new_uri.path_and_query.or(old_uri.path_and_query().cloned())
                {
                    url_builder = url_builder.path_and_query(path_and_query);
                }
                let new_uri = url_builder.build()?;
                *request.uri_mut() = new_uri;
            }
        }

        // Modify body if specified
        if let Some(ref new_body) = self.modify_body {
            let body_bytes = new_body.as_bytes().to_vec();

            // Update content-length header
            if let Ok(content_length) = body_bytes.len().to_string().parse() {
                request
                    .headers_mut()
                    .insert("content-length", content_length);
            }

            // Replace the body with the new content
            let new_body = Full::new(bytes::Bytes::from(body_bytes))
                .map_err(|e| anyhow::anyhow!("Body error: {}", e))
                .boxed();
            *request.body_mut() = new_body;
        }

        Ok(HandleRequestType::Request(request))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use http::Request;
    use http_body_util::Empty;
    use std::collections::HashMap;

    fn create_test_request() -> Req {
        Request::builder()
            .method("GET")
            .uri("http://example.com/test")
            .body(
                Empty::new()
                    .map_err(|e| anyhow::anyhow!("Body error: {}", e))
                    .boxed(),
            )
            .unwrap()
    }

    #[tokio::test]
    async fn test_modify_headers() -> Result<()> {
        let mut headers = HashMap::new();
        headers.insert("X-Test".to_string(), "test-value".to_string());

        let config = ModifyRequestConfig {
            modify_headers: Some(headers),
            modify_body: None,
            modify_method: None,
            modify_url: None,
        };

        let request = create_test_request();
        let result = config.handle_request(request).await?;

        if let HandleRequestType::Request(req) = result {
            assert_eq!(req.headers().get("X-Test").unwrap(), "test-value");
        }
        Ok(())
    }

    #[tokio::test]
    async fn test_modify_method() -> Result<()> {
        let config = ModifyRequestConfig {
            modify_headers: None,
            modify_body: None,
            modify_method: Some("POST".to_string()),
            modify_url: None,
        };

        let request = create_test_request();
        let result = config.handle_request(request).await?;

        if let HandleRequestType::Request(req) = result {
            assert_eq!(req.method(), &Method::POST);
        }
        Ok(())
    }

    #[tokio::test]
    async fn test_modify_url() -> Result<()> {
        let config = ModifyRequestConfig {
            modify_headers: None,
            modify_body: None,
            modify_method: None,
            modify_url: Some("/new-path".to_string()),
        };

        let request = create_test_request();
        let result = config.handle_request(request).await?;

        if let HandleRequestType::Request(req) = result {
            assert_eq!(req.uri().path(), "/new-path");
        }
        Ok(())
    }

    #[tokio::test]
    async fn test_modify_body() -> Result<()> {
        let new_body = "new body content";
        let config = ModifyRequestConfig {
            modify_headers: None,
            modify_body: Some(new_body.to_string()),
            modify_method: None,
            modify_url: None,
        };

        let request = create_test_request();
        let result = config.handle_request(request).await?;

        if let HandleRequestType::Request(req) = result {
            let content_length = req.headers().get("content-length").unwrap();
            assert_eq!(content_length, &new_body.len().to_string());
        }
        Ok(())
    }

    #[tokio::test]
    async fn test_no_modifications() -> Result<()> {
        let config = ModifyRequestConfig {
            modify_headers: None,
            modify_body: None,
            modify_method: None,
            modify_url: None,
        };

        let request = create_test_request();
        let original_method = request.method().clone();
        let original_uri = request.uri().clone();

        let result = config.handle_request(request).await?;

        if let HandleRequestType::Request(req) = result {
            assert_eq!(req.method(), &original_method);
            assert_eq!(req.uri(), &original_uri);
        }
        Ok(())
    }
}
