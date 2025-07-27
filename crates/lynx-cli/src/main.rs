use anyhow::Result;
use clap::Parser;
use lynx_cli::daemon::DaemonManager;
use lynx_cli::{Args, Commands, LogConfig, ProxyServerApp, ServerArgs, resolve_data_dir};
use tokio::signal;

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();

    match args.command {
        Commands::Start {
            server_args: ServerArgs { port, data_dir,log_level,connect_type },
        } => {
            let resolved_data_dir = resolve_data_dir(data_dir)?;
            let manager = DaemonManager::new(None)?;
            manager
                .start_daemon(
                    port,
                    Some(resolved_data_dir.to_string_lossy().to_string()),
                    log_level,
                    connect_type,
                )
                .await?;
        }
        Commands::Stop => {
            let manager = DaemonManager::new(None)?;
            manager.stop_daemon()?;
        }
        Commands::Restart => {
            let manager = DaemonManager::new(None)?;
            manager.restart_daemon().await?;
        }
        Commands::Status => {
            let manager = DaemonManager::new(None)?;
            manager.show_status()?;
        }
        Commands::Run {
            server_args: ServerArgs { port, data_dir, log_level,connect_type },
            daemon,
        } => {
            let resolved_data_dir = resolve_data_dir(data_dir)?;

            let mut log_config = LogConfig::new(log_level);
            if daemon {
                log_config = log_config.with_file(LogConfig::lynx_log_file(&resolved_data_dir))
            } else {
                log_config = log_config.with_console(true);
            }
            log_config.init_logging()?;

            let app = ProxyServerApp::new(
                port,
                Some(resolved_data_dir.to_string_lossy().to_string()),
                daemon,
                connect_type.into(),
            );
            app.start_server().await?;

            println!("Proxy server is running...");
            if !daemon {
                signal::ctrl_c().await?;
                println!("\nReceived Ctrl+C, shutting down...");
            }
        }
    }

    Ok(())
}
