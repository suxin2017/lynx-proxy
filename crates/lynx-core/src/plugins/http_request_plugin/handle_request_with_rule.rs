use std::str::FromStr;

use anyhow::{Result, anyhow};
use glob_match::glob_match;
use http::{Request, Uri};
use hyper::body::Incoming;
use sea_orm::EntityTrait;
use tracing::{trace, warn};

use crate::server_context::DB;

pub async fn handle_request_with_rule(mut req: Request<Incoming>) -> Result<Request<Incoming>> {
    // let db = DB.get().unwrap();

    // let rules = rule_content::Entity::find().all(db).await?;

    // let req_url = url::Url::parse(&req.uri().to_string())
    //     .map_err(|e| anyhow!(e).context("parse req url error"))?;

    // for rule in rules {
    //     let content = parse_rule_content(rule.content);
    //     let _ = content.map(|content| {
    //         let capture_glob_pattern_str = content.capture.uri;
    //         let is_match = glob_match(&capture_glob_pattern_str, req_url.as_str());
    //         trace!("is match: {}", is_match);
    //         trace!("capture_glob_pattern_str: {}", capture_glob_pattern_str);
    //         trace!("req_url: {}", req_url.as_str());
    //         if is_match {
    //             let pass_proxy_uri = url::Url::parse(&content.handler.proxy_pass);

    //             match pass_proxy_uri {
    //                 Ok(pass_proxy_uri) => {
    //                     let host = pass_proxy_uri.host_str();
    //                     let port = pass_proxy_uri.port();

    //                     let mut new_uri = req_url.clone();
    //                     let _ = new_uri.set_scheme(pass_proxy_uri.scheme());
    //                     let _ = new_uri.set_host(host);
    //                     let _ = new_uri.set_port(port);

    //                     trace!("new url: {:?}", new_uri);

    //                     if let Ok(new_uri) = Uri::from_str(new_uri.as_str()) {
    //                         let uri = req.uri_mut();
    //                         *uri = new_uri;
    //                     } else {
    //                         warn!("parse pass proxy uri error: {}", new_uri.as_str());
    //                     }
    //                 }
    //                 Err(e) => {
    //                     warn!("parse pass proxy uri error: {}", e);
    //                 }
    //             }
    //         };
    //     });
    // }
    Ok(req)
}
