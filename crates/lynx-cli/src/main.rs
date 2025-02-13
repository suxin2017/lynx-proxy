use std::fmt::Display;
use std::str::FromStr;
use std::{env, path::PathBuf};

use anyhow::Result;
use clap::{Parser, ValueEnum};
use console::style;
use directories::ProjectDirs;
use include_dir::{include_dir, Dir};
use lynx_core::config::InitAppConfigParams;
use lynx_core::self_service::SELF_SERVICE_PATH_PREFIX;
use lynx_core::server::{Server, ServerConfig};
use lynx_core::server_context::{set_up_context, InitContextParams};
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

fn escape_spaces_in_path(path: &PathBuf) -> String {
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

// compile time include asserts dir
static _ASSERT_DIR: Dir = include_dir!("$CARGO_MANIFEST_DIR/asserts");

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();

    // init log level
    let log_level = args.log_level;
    if !matches!(log_level, LogLevel::Silent) {
        let level = Level::from_str(&log_level.to_string()).expect("log level error");
        let lynx_cli_filter = filter::Targets::new()
            .with_target("lynx_cli", level)
            .with_target("lynx_core", level);
        tracing_subscriber::registry()
            .with(fmt::layer())
            .with(lynx_cli_filter)
            .init();
    }

    // init ui asserts
    let default_ui_asserts = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("asserts");

    // init data dir
    let data_dir = if let Some(data_dir) = args.data_dir {
        PathBuf::from(data_dir)
    } else {
        let project = ProjectDirs::from("cc", "suxin2017", "lynx").expect("get project dir error");
        project.data_dir().to_path_buf()
    };
    let data_dir_path = escape_spaces_in_path(&data_dir);

    info!("Starting proxy server");
    set_up_context(InitContextParams {
        init_app_config_params: InitAppConfigParams {
            ui_assert_dir: Some(default_ui_asserts),
            root_dir: Some(data_dir),
        },
    })
    .await;

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

    let web_path = server
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

    let _ = tokio::signal::ctrl_c().await;

    Ok(())
}
