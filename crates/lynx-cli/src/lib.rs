use std::fmt::Display;
use std::path::PathBuf;

use anyhow::Result;
use clap::{Args as ClapArgs, Parser, Subcommand, ValueEnum};
use directories::ProjectDirs;

pub mod daemon;
pub mod log_config;
pub mod proxy_server_app;

pub use daemon::DaemonManager;
pub use log_config::LogConfig;
use lynx_core::{ proxy_server::ConnectType as ProxyConnectType};


pub use proxy_server_app::ProxyServerApp;
use serde::{Deserialize, Serialize};

#[derive(Parser, Debug, Clone)]
#[command(version, about, long_about = None)]
pub struct Args {
    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Debug, Clone,Serialize,Deserialize, Copy, PartialEq, Eq, PartialOrd, Ord, ValueEnum)]
pub enum ConnectType {
    /// 短轮询
    ShortPoll,
    /// 服务器发送事件
    SSE,
}

impl Display for ConnectType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ConnectType::ShortPoll => write!(f, "short-poll"),
            ConnectType::SSE => write!(f, "sse"),
        }
    }
}

impl From<ConnectType> for ProxyConnectType {
    fn from(value: ConnectType) -> Self {
        match value {
            ConnectType::ShortPoll => ProxyConnectType::ShortPoll,
            ConnectType::SSE => ProxyConnectType::SSE,
        }
    }
}

#[derive(ClapArgs, Debug, Clone)]
pub struct ServerArgs {
    /// proxy server port
    #[arg(short, long, default_value_t = 7788)]
    pub port: u16,

    /// data dir
    /// The default data directory path following OS conventions:
    /// - Linux: ~/.local/share/lynx
    /// - macOS: ~/Library/Application Support/lynx  
    /// - Windows: %APPDATA%\suxin2017\lynx\data
    #[arg(long)]
    pub data_dir: Option<String>,

    /// Log level for the proxy server
    #[arg(long, value_enum, default_value_t = LogLevel::Info)]
    pub log_level: LogLevel,

    #[arg(long, value_enum, default_value_t = ConnectType::SSE)]
    pub connect_type: ConnectType,

    /// Enable local only mode (only bind to loopback addresses)
    #[arg(long, default_value_t = false)]
    pub local_only: bool,
}

#[derive(Subcommand, Debug, Clone)]
pub enum Commands {
    /// Start the background proxy service
    Start {
        #[command(flatten)]
        server_args: ServerArgs,
    },
    /// Stop the background proxy service
    Stop,
    /// Restart the background proxy service
    Restart,
    /// Show background proxy service status
    Status,
    /// Start the proxy server in foreground mode
    Run {
        #[command(flatten)]
        server_args: ServerArgs,

        /// Run in daemon mode (hidden)
        #[arg(long, hide = true, default_value_t = false)]
        daemon: bool,
    },
}

#[derive(Debug, Clone,Serialize,Deserialize, Copy, PartialEq, Eq, PartialOrd, Ord, ValueEnum)]
pub enum LogLevel {
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

pub fn get_default_data_dir() -> Result<PathBuf> {
    let project = ProjectDirs::from("cc", "suxin2017", "lynx")
        .ok_or_else(|| anyhow::anyhow!("Failed to get project directories"))?;

    let data_dir = project.data_dir().to_path_buf();

    // Create the directory if it doesn't exist
    if !data_dir.exists() {
        std::fs::create_dir_all(&data_dir).map_err(|e| {
            anyhow::anyhow!(
                "Failed to create data directory {}: {}",
                data_dir.display(),
                e
            )
        })?;
    }

    Ok(data_dir)
}

/// Get the data directory, using the provided path or falling back to default
///
/// # Arguments
/// * `data_dir` - Optional data directory path
///
/// # Returns
/// The resolved data directory path
pub fn resolve_data_dir(data_dir: Option<String>) -> Result<PathBuf> {
    match data_dir {
        Some(path) => {
            let path_buf = PathBuf::from(path);
            // Create the directory if it doesn't exist
            if !path_buf.exists() {
                std::fs::create_dir_all(&path_buf).map_err(|e| {
                    anyhow::anyhow!(
                        "Failed to create data directory {}: {}",
                        path_buf.display(),
                        e
                    )
                })?;
            }
            Ok(path_buf)
        }
        None => get_default_data_dir(),
    }
}
