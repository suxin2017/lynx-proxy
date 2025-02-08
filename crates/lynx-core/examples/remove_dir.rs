use std::env;

use futures_util::StreamExt;
use tokio::fs;
use tokio_stream::wrappers::ReadDirStream;

#[tokio::main]
async fn main() {
    let path = env::current_exe().unwrap();
    let a = path.parent().unwrap().join("a");

    let mut entries = fs::read_dir(a).await.unwrap();

    let read_dir_stream = ReadDirStream::new(entries);
    read_dir_stream
        .for_each(|entry| async {
            let p = &entry.unwrap().path();

            tokio::fs::remove_dir_all(p).await.unwrap();
        }).await;
    // tokio::fs::remove_dir_all(a).await.unwrap();
}
