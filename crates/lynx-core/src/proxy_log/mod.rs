use std::sync::Arc;

use once_cell::sync::Lazy;
use tokio::sync::broadcast;
use tracing::{debug, error};

pub mod body_write_to_file;
pub mod message;
pub mod request_record;

pub static PROXY_BOARD_CAST: Lazy<Arc<broadcast::Sender<message::Message>>> = Lazy::new(|| {
    let (tx, _) = broadcast::channel::<message::Message>(10);

    Arc::new(tx)
});

pub fn has_receiver() -> bool {
    let tx = Arc::clone(&PROXY_BOARD_CAST);
    tx.receiver_count() > 0
}

pub fn try_send_message(msg: message::Message) {
    let tx = Arc::clone(&PROXY_BOARD_CAST);
    debug!("current receiver count: {}", tx.receiver_count());
    if !has_receiver() {
        debug!("no receiver, skip send message");
        return;
    }
    if tx.send(msg).is_err() {
        error!("send request raw failed");
    }
    debug!("send message success");
}
