use std::fmt::Display;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use anyhow::Result;
use clap::{Parser, ValueEnum};
use console::style;
use directories::ProjectDirs;
use include_dir::include_dir;
use lynx_core::proxy_server::server_ca_manage::ServerCaManagerBuilder;
use lynx_core::proxy_server::server_config::ProxyServerConfigBuilder;
use lynx_core::proxy_server::{ProxyServerBuilder, StaticDir};
use lynx_core::self_service::SELF_SERVICE_PATH_PREFIX;
use sea_orm::ConnectOptions;
use tokio::signal;
use tracing::info;
use tracing_subscriber::EnvFilter;
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
struct Args {
    /// proxy server port
    #[arg(short, long, default_value_t = 3000)]
    port: u16,
    /// only allow localhost access
    #[arg(long, default_value_t = true)]
    only_localhost: bool,

    /// log level
    #[arg(long,  value_enum, default_value_t = LogLevel::Silent)]
    log_level: LogLevel,

    /// data dir
    /// if not set, use default data dir
    #[arg(long)]
    data_dir: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, ValueEnum)]
enum LogLevel {
    Silent,
    Info,
    Error,
    Debug,
    Trace,
}

impl Display for LogLevel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LogLevel::Silent => write!(f, "silent"),
            LogLevel::Info => write!(f, "info"),
            LogLevel::Error => write!(f, "error"),
            LogLevel::Debug => write!(f, "debug"),
            LogLevel::Trace => write!(f, "trace"),
        }
    }
}

#[allow(dead_code)]
fn escape_spaces_in_path(path: &Path) -> String {
    path.to_string_lossy()
        .chars()
        .flat_map(|c| {
            if c == ' ' {
                vec!['\\', ' '].into_iter()
            } else {
                vec![c].into_iter()
            }
        })
        .collect()
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();

    // init log level
    let log_level = args.log_level;
    let env_filter = if !matches!(log_level, LogLevel::Silent) {
        EnvFilter::from_default_env()
            .add_directive(format!("lynx_cli={}", log_level.to_string()).parse()?)
            .add_directive(format!("lynx_core={}", log_level.to_string()).parse()?)
    } else {
        EnvFilter::from_default_env()
    };
    tracing_subscriber::registry()
        .with(fmt::layer())
        .with(env_filter)
        .init();
    info!("Starting proxy server");

    let data_dir = if let Some(data_dir) = args.data_dir {
        PathBuf::from(data_dir)
    } else {
        let project = ProjectDirs::from("cc", "suxin2017", "lynx").expect("get project dir error");
        project.data_dir().to_path_buf()
    };

    if !data_dir.exists() {
        std::fs::create_dir_all(&data_dir)?;
    }

    println!(
        "The proxy service data directory: \n{}",
        style(data_dir.to_string_lossy()).yellow()
    );

    let data_dir_path = escape_spaces_in_path(&data_dir);

    let assets_dir = include_dir!("$CARGO_MANIFEST_DIR/assets");

    let server_config = ProxyServerConfigBuilder::default()
        .root_cert_file_path(data_dir.join("root.pem"))
        .root_key_file_path(data_dir.join("key.pem"))
        .build()?;

    let server_ca_manager = ServerCaManagerBuilder::new(
        server_config.root_cert_file_path.clone(),
        server_config.root_key_file_path.clone(),
    )
    .build()?;

    let db_connect = ConnectOptions::new(format!("sqlite://{}/lynx.db?mode=rwc", data_dir_path));

    let mut proxy_server = ProxyServerBuilder::default()
        .config(Arc::new(server_config))
        .port(3000)
        .server_ca_manager(Arc::new(server_ca_manager))
        .db_config(db_connect)
        .static_dir(Arc::new(StaticDir(assets_dir)))
        .build()
        .await?;

    proxy_server.run().await?;

    let addrs = proxy_server
        .access_addr_list
        .iter()
        .map(|addr| format!("  http://{} and https://{}", addr, addr))
        .collect::<Vec<String>>()
        .join("\n");
    println!("The proxy service was started");
    println!("{}{}", style("Available on: \n").green(), addrs);

    let web_path = proxy_server
        .access_addr_list
        .iter()
        .map(|addr| format!("  http://{}{}", addr, SELF_SERVICE_PATH_PREFIX))
        .collect::<Vec<String>>()
        .join("\n");
    println!("{}{}", style("Web UI is available on:\n").green(), web_path);
    println!(
        "\nThe proxy service data directory: \n{}",
        style(data_dir_path).yellow()
    );
    println!("\nPress {} to stop the service", style("Ctrl+C").yellow());

    signal::ctrl_c()
        .await
        .expect("Failed to install Ctrl+C signal handler");
    Ok(())
}
