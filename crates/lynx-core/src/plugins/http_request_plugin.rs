use std::path::PathBuf;
use std::str::FromStr;
use std::sync::Arc;
use std::{fs, io};

use anyhow::{anyhow, Error, Result};
use bytes::Bytes;
use http::header::{CONNECTION, CONTENT_LENGTH, HOST, PROXY_AUTHORIZATION};
use http::uri::Scheme;
use http::Uri;
use http_body_util::combinators::BoxBody;
use http_body_util::{BodyExt, StreamBody};
use hyper::body::Incoming;
use hyper::{Request, Response};
use hyper_rustls::HttpsConnectorBuilder;
use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::client::legacy::Client;
use hyper_util::rt::TokioExecutor;
use sea_orm::EntityTrait;
use tokio::io::AsyncWriteExt;
use tokio::sync::mpsc;
use tokio_rustls::rustls::{ClientConfig, RootCertStore};
use tokio_stream::wrappers::ReceiverStream;
use tracing::{error, warn};

use crate::entities::rule_content::{self, parse_rule_content};
use crate::proxy_log::body_write_to_file::{req_body_file, res_body_file};
use crate::schedular::get_req_trace_id;
use crate::server_context::DB;

pub async fn build_proxy_request(
    req: Request<Incoming>,
) -> Result<Request<BoxBody<bytes::Bytes, anyhow::Error>>> {
    let trace_id = get_req_trace_id(&req);

    let (parts, body) = req.into_parts();
    let mut body = body
        .map_err(|e| anyhow!(e).context("http request body box error"))
        .boxed();
    let (tx, rx) = mpsc::channel(1024);

    let rec_stream = ReceiverStream::new(rx);
    // let rs = rec_stream.;
    let stream: BoxBody<Bytes, Error> = BodyExt::boxed(StreamBody::new(rec_stream));

    tokio::spawn(async move {
        let mut req_body_file = req_body_file(&trace_id).await;

        while let Some(frame) = body.frame().await {
            if let Ok(frame) = &frame {
                if let Some(data) = frame.data_ref() {
                    if let Ok(file) = &mut req_body_file {
                        let res = file.write_all(data).await;
                        if let Err(e) = res {
                            error!("write file res: {:?}", e);
                        }
                    }
                }
            }
            let _ = tx.send(frame).await;
        }
    });

    let req_url = url::Url::parse(&parts.uri.to_string().as_str()).unwrap();
    let mut builder = hyper::Request::builder().method(parts.method);

    let db = DB.get().unwrap();

    let rules = rule_content::Entity::find().all(db).await?;

    for rule in rules {
        match parse_rule_content(rule.content) {
            Ok(content) => {
                let match_url = url::Url::parse(&content.r#match.uri);

                match match_url {
                    Ok(match_url) => {
                        if req_url.host_str() == match_url.host_str() {
                            println!("content: {:?}", content);
                            // let uri_ref = builder.uri_ref();
                            let new_uri_string =
                                format!("{}{}", content.target.uri, req_url.path());

                            println!("new uri: {:?}", &new_uri_string);

                            let new_uri =  Uri::from_str(&new_uri_string)?;

                            builder = builder.uri(new_uri);

                            println!("match url: {:?}", match_url);
                        }
                    }
                    Err(e) => {
                        warn!("parse match url error: {}", e);
                    }
                }
                println!("content: {:?}", content);
            }
            Err(e) => {
                warn!("parse rule content error: {}", e);
            }
        }
    }

    if builder.uri_ref().is_none() {
        builder = builder.uri(parts.uri);
    }

    for (key, value) in parts.headers.into_iter() {
        if let Some(key) = key {
            if matches!(
                &key,
                &HOST | &CONNECTION | &PROXY_AUTHORIZATION | &CONTENT_LENGTH
            ) {
                continue;
            }
            builder = builder.header(key, value);
        }
    }

    builder.body(stream).map_err(|e| anyhow!(e))
}

pub async fn build_proxy_response(
    trace_id: Arc<String>,
    res: Response<Incoming>,
) -> Result<Response<BoxBody<bytes::Bytes, anyhow::Error>>> {
    let (parts, body) = res.into_parts();

    let mut body = body
        .map_err(|e| anyhow!(e).context("http proxy body box error"))
        .boxed();

    let (tx, rx) = mpsc::channel(1024);

    let rec_stream = ReceiverStream::new(rx);
    // let rs = rec_stream.;
    let stream: BoxBody<Bytes, Error> = BodyExt::boxed(StreamBody::new(rec_stream));

    tokio::spawn(async move {
        let mut res_body_file = res_body_file(&trace_id).await;

        while let Some(frame) = body.frame().await {
            if let Ok(frame) = &frame {
                if let Some(data) = frame.data_ref() {
                    if let Ok(file) = &mut res_body_file {
                        let res = file.write_all(data).await;
                        if let Err(e) = res {
                            error!("write file res: {:?}", e);
                        }
                    }
                }
            }
            let _ = tx.send(frame).await;
        }
    });
    Ok(Response::from_parts(parts, stream))
}

pub async fn request(req: Request<Incoming>) -> Result<Response<Incoming>> {
    let client_builder = Client::builder(TokioExecutor::new());
    let proxy_req = build_proxy_request(req).await?;
    let proxy_res = if proxy_req.uri().scheme() == Some(&Scheme::HTTPS) {
        println!("fetching {:?}", proxy_req);

        #[cfg(feature = "test")]
        let connect = get_test_root_ca();

        #[cfg(not(feature = "test"))]
        let connect = HttpsConnectorBuilder::new()
            .with_webpki_roots()
            .https_only()
            .enable_all_versions()
            .build();

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

#[cfg(feature = "test")]
fn get_test_root_ca() -> hyper_rustls::HttpsConnector<HttpConnector> {
    let connect_builder = HttpsConnectorBuilder::new();
    let mut ca_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    ca_path.push("tests/fixtures/RootCA.crt");
    let ca_file = fs::File::open(ca_path).unwrap();
    let mut rd = io::BufReader::new(ca_file);

    // Read trust roots
    let certs = rustls_pemfile::certs(&mut rd)
        .collect::<Result<Vec<_>, _>>()
        .unwrap();
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
}
