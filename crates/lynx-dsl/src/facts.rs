//! Request attribute snapshot used by [`crate::eval::eval_program`].
///
/// Header keys are stored lowercase and sorted by key for binary search in eval.
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RequestFacts {
    pub scheme: Option<String>,
    pub host: String,
    pub port: Option<u16>,
    pub path: String,
    /// Raw query string without the leading `?` (e.g. `a=1&b=2`).
    pub query: Option<String>,
    pub method: String,
    pub headers: Vec<(String, String)>,
}

impl RequestFacts {
    pub fn builder() -> RequestFactsBuilder {
        RequestFactsBuilder::default()
    }
}

#[derive(Debug, Default)]
pub struct RequestFactsBuilder {
    scheme: Option<String>,
    host: Option<String>,
    port: Option<u16>,
    path: Option<String>,
    query: Option<String>,
    method: Option<String>,
    headers: Vec<(String, String)>,
}

impl RequestFactsBuilder {
    pub fn scheme(mut self, scheme: impl Into<String>) -> Self {
        self.scheme = Some(scheme.into());
        self
    }

    pub fn host(mut self, host: impl Into<String>) -> Self {
        self.host = Some(host.into());
        self
    }

    pub fn port(mut self, port: u16) -> Self {
        self.port = Some(port);
        self
    }

    pub fn path(mut self, path: impl Into<String>) -> Self {
        self.path = Some(path.into());
        self
    }

    pub fn query(mut self, query: impl Into<String>) -> Self {
        self.query = Some(query.into());
        self
    }

    pub fn method(mut self, method: impl Into<String>) -> Self {
        self.method = Some(method.into());
        self
    }

    pub fn header(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.headers
            .push((key.into().to_ascii_lowercase(), value.into()));
        self
    }

    pub fn build(self) -> RequestFacts {
        let mut headers = self.headers;
        headers.sort_by(|(left, _), (right, _)| left.cmp(right));
        RequestFacts {
            scheme: self.scheme,
            host: self.host.unwrap_or_default(),
            port: self.port,
            path: self.path.unwrap_or_else(|| "/".to_string()),
            query: self.query,
            method: self.method.unwrap_or_else(|| "GET".to_string()),
            headers,
        }
    }
}
