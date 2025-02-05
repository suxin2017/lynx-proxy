use std::{env, path::PathBuf};

use anyhow::{Ok, Result};
use clap::Parser;
use lynx_core::server::Server;
use lynx_core::server_context::set_up_context;
use tracing_subscriber::{
    filter::FilterFn, fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter, Layer,
};

#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
struct Args {
    /// proxy server port
    #[arg(short, long, default_value_t = 3000)]
    port: u16,
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();
    tracing_subscriber::registry()
        .with(fmt::layer())
        .with(EnvFilter::from_default_env())
        .init();

    let default_ui_asserts = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("asserts");
    println!("default_ui_asserts: {:?}", default_ui_asserts);

    set_up_context(Some(default_ui_asserts)).await;

    Server::new(args.port).run().await?;
    let _ = tokio::signal::ctrl_c().await;
    Ok(())
}
