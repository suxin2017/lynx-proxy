use std::{net::IpAddr, path::PathBuf, time::Duration};

use local_ip_address::list_afinet_netifas;
use once_cell::sync::OnceCell;
use tokio::{
    fs::{self, OpenOptions},
    io::AsyncWriteExt,
    join, spawn,
    time::sleep,
};

struct A {
    path: String,
}
pub static CONFIG: OnceCell<A> = OnceCell::new();

pub fn get_config() -> &'static A {
    CONFIG.get().unwrap()
}

#[tokio::main]
async fn main() {
    CONFIG
        .set(A {
            path: "localhost_ip.txt".into(),
        });

    let a = spawn(async {
        let config = &get_config().path;

        let file = PathBuf::from(config);
        let mut file = if file.is_file() {
            println!("open file a");
            OpenOptions::new().append(true).open(file).await.unwrap()
        } else {
            OpenOptions::new()
                .create(true)
                .append(true)
                .open(file)
                .await
                .expect("Failed to create file")
        };
        let mut count = 0;
        loop {
            if count > 10 {
                break;
            }
            count += 1;
            println!("write a to file");
            file.write_all(format!("{count} a\n").as_bytes())
                .await
                .expect("Failed to write to file");
            sleep(Duration::from_millis(100)).await;
        }
    });

    let b = spawn(async {
        let config = &get_config().path;

        let file = PathBuf::from(config);
        let mut file = if file.is_file() {
            println!("open file b");
            OpenOptions::new().append(true).open(file).await.unwrap()
        } else {
            OpenOptions::new()
                .create(true)
                .append(true)
                .open(file)
                .await
                .expect("Failed to create file")
        };
        let mut count = 0;
        loop {
            if count > 10 {
                break;
            }
            count += 1;
            println!("write b to file");
            file.write_all(format!("{count} b\n").as_bytes())
                .await
                .expect("Failed to write to file");
            sleep(Duration::from_millis(100)).await;
        }
    });

    sleep(Duration::from_secs(10)).await;
}
