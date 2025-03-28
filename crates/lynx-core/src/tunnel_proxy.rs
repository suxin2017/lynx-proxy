use anyhow::Error;
use http_body_util::combinators::BoxBody;
use hyper::body::{Bytes, Incoming};
use hyper::upgrade::Upgraded;
use hyper::{Method, Request, Response};
use hyper_util::rt::TokioIo;
use sea_orm::{ActiveModelTrait, Set};
use tokio::net::TcpStream;
use tracing::{error, trace};

use crate::entities::request;
use crate::proxy_log::message::Message;
use crate::proxy_log::try_send_message;
use crate::schedular::get_req_trace_id;
use crate::server_context::get_db_connect;
use crate::utils::{empty, host_addr};

pub async fn tunnel_proxy(
    req: Request<Incoming>,
) -> anyhow::Result<Response<BoxBody<Bytes, Error>>> {
    // Extract the host and port from the request URI
    if Method::CONNECT == req.method() {
        let trace_id = get_req_trace_id(&req);
        let request_active_model = request::ActiveModel {
            trace_id: Set(trace_id.to_string()),
            uri: Set(req.uri().to_string()),
            method: Set(req.method().to_string()),
            schema: Set(req.uri().scheme_str().unwrap_or("").to_string()),
            version: Set(format!("{:?}", req.version())),
            status_code: Set(Some(200)),
            ..Default::default()
        };
        let record = request_active_model.insert(get_db_connect()).await?;
        try_send_message(Message::add(record));

        if let Some(addr) = host_addr(req.uri()) {
            tokio::task::spawn(async move {
                match hyper::upgrade::on(req).await {
                    Ok(upgraded) => {
                        if let Err(e) = tunnel(upgraded, addr).await {
                            error!("server io error: {}", e)
                        };
                    }
                    Err(e) => {
                        error!("upgrade error: {:?}", e)
                    }
                }
            });
        }
    }

    Ok(Response::new(empty()))
}
pub async fn tunnel(upgraded: Upgraded, addr: String) -> std::io::Result<()> {
    let mut server = TcpStream::connect(addr).await?;

    let mut upgraded = TokioIo::new(upgraded);

    // Proxying data
    let (from_client, from_server) =
        tokio::io::copy_bidirectional(&mut upgraded, &mut server).await?;

    trace!(
        "client wrote {} bytes and received {} bytes",
        from_client, from_server
    );

    Ok(())
}
