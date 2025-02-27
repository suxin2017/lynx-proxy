use std::str::FromStr;

use anyhow::{Result, anyhow};
use glob_match::glob_match;
use http::{Request, Uri};
use hyper::body::Incoming;
use sea_orm::EntityTrait;
use tracing::{trace, warn};

use crate::{
    bo::rule_content::{Handler, RuleContent, get_all_rule_content},
    server_context::DB,
};

pub async fn handle_request_with_rule(mut req: Request<Incoming>) -> Result<Request<Incoming>> {
    let db = DB.get().unwrap();

    let all_handlers = req.extensions().get::<Vec<Handler>>();

    let connect_handler = all_handlers.map(|handlers| {
        handlers
            .iter()
            .map(|handler| match handler {
                Handler::ConnectPassProxyHandler(handler) => handler,
            })
            .collect::<Vec<_>>()
    });

    if let Some(connect_handler) = connect_handler {
        if !connect_handler.is_empty() {
            return Ok(req);
        }
        let req_url = url::Url::parse(&req.uri().to_string())
            .map_err(|e| anyhow!(e).context("parse req url error"))?;

        let connect_handler = connect_handler.first().unwrap();
        let pass_proxy_uri = url::Url::parse(&connect_handler.url);
        match pass_proxy_uri {
            Ok(pass_proxy_uri) => {
                let host = pass_proxy_uri.host_str();
                let port = pass_proxy_uri.port();

                let mut new_uri = req_url.clone();
                let _ = new_uri.set_scheme(pass_proxy_uri.scheme());
                let _ = new_uri.set_host(host);
                let _ = new_uri.set_port(port);

                trace!("new url: {:?}", new_uri);

                if let Ok(new_uri) = Uri::from_str(new_uri.as_str()) {
                    let uri = req.uri_mut();
                    *uri = new_uri;
                } else {
                    warn!("parse pass proxy uri error: {}", new_uri.as_str());
                }
            }
            Err(e) => {
                warn!("parse pass proxy uri error: {}", e);
            }
        }
    }

    Ok(req)
}
