use anyhow::{Error, Result, anyhow};
use futures_util::{SinkExt, StreamExt};
use http_body_util::BodyExt;
use http_body_util::combinators::BoxBody;
use hyper::body::{Bytes, Incoming};
use hyper::{Request, Response};
use hyper_tungstenite::HyperWebsocket;
use tokio_tungstenite::tungstenite::Message;

pub struct WebsocketProxy {}

impl WebsocketProxy {
    pub async fn proxy(
        &self,
        req: Request<Incoming>,
    ) -> anyhow::Result<Response<BoxBody<Bytes, Error>>> {
        let mut req = req;
        let (response, websocket) = hyper_tungstenite::upgrade(&mut req, None)?;

        // Spawn a task to handle the websocket connection.
        tokio::spawn(async move {
            if let Err(e) = serve_websocket(websocket).await {
                eprintln!("Error in websocket connection: {e}");
            }
        });
        let (parts, body) = response.into_parts();

        let body = body.boxed().map_err(|e| anyhow!(e)).boxed();

        Ok(Response::from_parts(parts, body))
    }
}

/// Handle a websocket connection.
async fn serve_websocket(websocket: HyperWebsocket) -> Result<()> {
    let mut websocket = websocket.await?;
    while let Some(message) = websocket.next().await {
        match message? {
            Message::Text(msg) => {
                println!("Received text message: {msg}");
                websocket
                    .send(Message::text("Thank you, come again."))
                    .await?;
            }
            Message::Binary(msg) => {
                println!("Received binary message: {msg:02X?}");
                websocket
                    .send(Message::binary(b"Thank you, come again.".to_vec()))
                    .await?;
            }
            Message::Ping(msg) => {
                // No need to send a reply: tungstenite takes care of this for you.
                println!("Received ping message: {msg:02X?}");
            }
            Message::Pong(msg) => {
                println!("Received pong message: {msg:02X?}");
            }
            Message::Close(msg) => {
                // No need to send a reply: tungstenite takes care of this for you.
                if let Some(msg) = &msg {
                    println!(
                        "Received close message with code {} and message: {}",
                        msg.code, msg.reason
                    );
                } else {
                    println!("Received close message");
                }
            }
            Message::Frame(_msg) => {
                unreachable!();
            }
        }
    }

    Ok(())
}
