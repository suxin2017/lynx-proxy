use std::path::PathBuf;
use std::{fs, io};

use anyhow::{anyhow, Result};
use futures_util::StreamExt;
use http::header::{CONNECTION, HOST, PROXY_AUTHORIZATION};
use http::uri::Scheme;
use http_body_util::BodyExt;
use hyper::body::Incoming;
use hyper::{Request, Response};
use hyper_rustls::{ConfigBuilderExt, HttpsConnectorBuilder};
use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::client::legacy::Client;
use hyper_util::rt::TokioExecutor;
use tokio_rustls::rustls::{ClientConfig, RootCertStore};


pub struct HttpRequestPlugin;

impl HttpRequestPlugin {
    pub async fn build_proxy_request(req: Request<Incoming>) -> Result<Request<Incoming>> {
        let (parts, body) = req.into_parts();

        let mut builder = hyper::Request::builder()
            .uri(parts.uri)
            .method(parts.method);

        for (key, value) in parts.headers.into_iter() {
            if let Some(key) = key {
                if matches!(&key, &HOST | &CONNECTION | &PROXY_AUTHORIZATION) {
                    continue;
                }
                builder = builder.header(key, value);
            }
        }

        builder.body(body).map_err(|e| anyhow!(e))
    }

    pub async fn request(&self, req: Request<Incoming>) -> Result<Response<Incoming>> {
        let client_builder = Client::builder(TokioExecutor::new());
        let proxy_req = HttpRequestPlugin::build_proxy_request(req).await?;

        let proxy_res = if proxy_req.uri().scheme() == Some(&Scheme::HTTPS) {
            let connect_builder = HttpsConnectorBuilder::new();
            let connect = if matches!(
                proxy_req
                    .uri()
                    .authority().map(|authority| authority.host() == "127.0.0.1"),
                Some(true)
            ) {
                let mut ca_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
                ca_path.push("tests/fixtures/RootCA.crt");
                let ca_file = fs::File::open(ca_path).unwrap();
                let mut rd = io::BufReader::new(ca_file);

                // Read trust roots
                let certs = rustls_pemfile::certs(&mut rd).collect::<Result<Vec<_>, _>>()?;
                let mut roots = RootCertStore::empty();
                roots.add_parsable_certificates(certs);
                // TLS client config using the custom CA store for lookups
                let tls = ClientConfig::builder()
                    .with_root_certificates(roots)
                    .with_no_client_auth();
                connect_builder
                    .with_tls_config(tls)
                    .https_only()
                    .enable_all_versions()
                    .build()
            } else {
                connect_builder
                    .with_webpki_roots()
                    .https_only()
                    .enable_all_versions()
                    .build()
            };

            client_builder.build(connect).request(proxy_req).await
        } else {
            println!("fetching {:?}", proxy_req);
            client_builder
                .build(HttpConnector::new())
                .request(proxy_req)
                .await
        };

        proxy_res.map_err(|e| anyhow!(e))
    }
}

