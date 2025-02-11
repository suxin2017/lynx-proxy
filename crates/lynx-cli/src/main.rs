use std::fmt::Display;
use std::str::FromStr;
use std::{env, path::PathBuf};

use anyhow::{Ok, Result};
use clap::{Parser, ValueEnum};
use console::style;
use lynx_core::server::{Server, ServerConfig};
use lynx_core::server_context::set_up_context;
use tracing::{info, Level};
use tracing_subscriber::filter;
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
    #[arg(long,  value_enum, default_value_t = LogLevel::Info)]
    log_level: LogLevel,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, ValueEnum)]
enum LogLevel {
    Info,
    Error,
    Debug,
    Trace,
}

impl Display for LogLevel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LogLevel::Info => write!(f, "info"),
            LogLevel::Error => write!(f, "error"),
            LogLevel::Debug => write!(f, "debug"),
            LogLevel::Trace => write!(f, "trace"),
        }
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();
    let log_level = args.log_level;

    let level = Level::from_str(&log_level.to_string()).expect("log level error");

    let lynx_cli_filter = filter::Targets::new()
        .with_target("lynx_cli", level)
        .with_target("lynx_core", level);
    tracing_subscriber::registry()
        .with(fmt::layer())
        .with(lynx_cli_filter)
        .init();

    let default_ui_asserts = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("asserts");
    info!("Starting proxy server");
    set_up_context(Some(default_ui_asserts)).await;

    let mut server = Server::new(ServerConfig {
        port: args.port,
        only_localhost: args.only_localhost,
    });
    server.run().await?;
    let addrs = server
        .access_addr_list
        .iter()
        .map(|addr| format!("  http://{}", addr))
        .collect::<Vec<String>>()
        .join("\n");
    println!("The proxy service was started");
    println!("{}{}", style("Available on: \n").green(), addrs);

    let _ = tokio::signal::ctrl_c().await;

    Ok(())
}
