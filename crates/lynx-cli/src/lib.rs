use std::path::PathBuf;

use anyhow::Result;
use clap::{Args as ClapArgs, Parser, Subcommand, ValueEnum};
use directories::ProjectDirs;

pub mod daemon;
pub mod cert;
pub mod cert_cmd;
pub mod log_config;
pub mod proxy_server_app;
pub mod rules_cmd;
pub mod version_check;

pub use daemon::DaemonManager;
pub use log_config::LogConfig;

pub use proxy_server_app::ProxyServerApp;
use serde::{Deserialize, Serialize};

#[derive(Parser, Debug, Clone)]
#[command(version, about, long_about = None)]
pub struct Args {
    #[command(subcommand)]
    pub command: Commands,
}

#[derive(ClapArgs, Debug, Clone)]
pub struct ServerArgs {
    /// proxy server port
    #[arg(long, default_value_t = 7788)]
    pub port: u16,

    /// data dir
    /// The default data directory path following OS conventions:
    /// - Linux: ~/.local/share/lynx
    /// - macOS: ~/Library/Application Support/lynx  
    /// - Windows: %APPDATA%\xin2017338\lynx\data
    #[arg(long)]
    pub data_dir: Option<String>,

    /// Log level for the proxy server
    #[arg(long, value_enum, default_value_t = LogLevel::Info)]
    pub log_level: LogLevel,

    /// Enable local only mode (only bind to loopback addresses)
    #[arg(long, default_value_t = false)]
    pub local_only: bool,

    /// Self-service login username (optional; requires --pass)
    #[arg(long, short = 'u')]
    pub user: Option<String>,

    /// Self-service login password (optional; requires --user)
    #[arg(long, short = 'p')]
    pub pass: Option<String>,
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
    /// Push, pull, and apply project rule config (.lynx.json)
    Rules {
        #[command(subcommand)]
        command: RulesCommands,
    },
    /// Install or manage the Lynx root CA in the system trust store (macOS)
    Cert {
        #[command(subcommand)]
        command: CertCommands,
    },
}

#[derive(ClapArgs, Debug, Clone)]
pub struct RulesFileArgs {
    /// Project config file path (default: ./.lynx.json in current directory)
    #[arg(long)]
    pub file: Option<std::path::PathBuf>,

    /// Proxy data directory
    #[arg(long)]
    pub data_dir: Option<String>,

    /// Rule project id (default: active project from data_dir/settings/projects.json)
    #[arg(long)]
    pub project: Option<String>,
}

#[derive(Subcommand, Debug, Clone)]
pub enum RulesCommands {
    /// Push local proxy rules (data-dir) to .lynx.json (creates the file if missing)
    Push {
        #[command(flatten)]
        args: RulesFileArgs,
    },
    /// Pull rules from .lynx.json into the local proxy data directory (creates the file if missing)
    Pull {
        #[command(flatten)]
        args: RulesFileArgs,
    },
    /// Apply enabled switches from .lynx.json (toggle only, no create/delete)
    Apply {
        #[command(flatten)]
        args: RulesFileArgs,
    },
    /// Export JSON Schema for `.lynx.json` project rule config
    Schema {
        #[command(subcommand)]
        command: RulesSchemaCommands,
    },
}

#[derive(Subcommand, Debug, Clone)]
pub enum RulesSchemaCommands {
    /// Export the JSON Schema to a file
    Export {
        /// Output path for the schema JSON (default: ./schemas/rules-export.schema.json)
        #[arg(long)]
        out: Option<std::path::PathBuf>,
    },
}

#[derive(ClapArgs, Debug, Clone)]
pub struct CertArgs {
    /// Proxy data directory
    #[arg(long)]
    pub data_dir: Option<String>,
}

#[derive(Subcommand, Debug, Clone)]
pub enum CertCommands {
    /// Trust the Lynx root CA in System Keychain (macOS)
    Install {
        #[command(flatten)]
        args: CertArgs,
    },
    /// Remove the Lynx root CA from System Keychain
    Uninstall {
        #[command(flatten)]
        args: CertArgs,
    },
    /// Show root CA and System Keychain trust status
    Status {
        #[command(flatten)]
        args: CertArgs,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, Copy, PartialEq, Eq, PartialOrd, Ord, ValueEnum)]
pub enum LogLevel {
    Silent,
    Info,
    Error,
    Debug,
    Trace,
}

impl std::fmt::Display for LogLevel {
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
    let project = ProjectDirs::from("cc", "xin2017338", "lynx")
        .ok_or_else(|| anyhow::anyhow!("Failed to get project directories"))?;

    let data_dir = project.data_dir().to_path_buf();

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

pub fn resolve_data_dir(data_dir: Option<String>) -> Result<PathBuf> {
    match data_dir {
        Some(path) => {
            let path_buf = PathBuf::from(path);
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
