use std::{fs, path::PathBuf, sync::Arc};

use anyhow::{Ok, Result};
use lynx_core::proxy_server::{
    ProxyServer, ProxyServerBuilder, server_ca_manage::ServerCaManagerBuilder,
    server_config::ProxyServerConfigBuilder,
};
use nanoid::nanoid;
use rcgen::Certificate;

pub async fn setup_proxy_server(
    custom_certs: Option<Arc<Vec<Arc<Certificate>>>>,
) -> Result<ProxyServer> {
    let fixed_temp_dir_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/temp");

    if !fixed_temp_dir_path.exists() {
        fs::create_dir_all(&fixed_temp_dir_path)?;
    }

    // Use a unique subdir per test to avoid cross-test races on files.
    let run_dir = fixed_temp_dir_path.join(nanoid!());
    fs::create_dir_all(&run_dir)?;

    let server_config = ProxyServerConfigBuilder::default()
        .root_cert_file_path(run_dir.join("root.pem"))
        .root_key_file_path(run_dir.join("key.pem"))
        .build()?;

    let server_ca_manager = ServerCaManagerBuilder::new(
        server_config.root_cert_file_path.clone(),
        server_config.root_key_file_path.clone(),
    )
    .build()?;

    let mut proxy_server_builder = ProxyServerBuilder::default();

    proxy_server_builder
        .config(Arc::new(server_config))
        .server_ca_manager(Arc::new(server_ca_manager))
        .data_dir(run_dir.join("db"));
    if let Some(custom_certs) = custom_certs {
        proxy_server_builder.custom_certs(custom_certs.clone());
        proxy_server_builder.api_custom_certs(custom_certs);
    }

    let mut proxy_server = proxy_server_builder.build().await?;
    proxy_server.run().await?;
    Ok(proxy_server)
}

#[allow(dead_code)]
pub async fn setup_short_poll_proxy_server(
    custom_certs: Option<Arc<Vec<Arc<Certificate>>>>,
) -> Result<ProxyServer> {
    let fixed_temp_dir_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/temp");

    if !fixed_temp_dir_path.exists() {
        fs::create_dir_all(&fixed_temp_dir_path)?;
    }

    let run_dir = fixed_temp_dir_path.join(nanoid!());
    fs::create_dir_all(&run_dir)?;

    let server_config = ProxyServerConfigBuilder::default()
        .root_cert_file_path(run_dir.join("root.pem"))
        .root_key_file_path(run_dir.join("key.pem"))
        .build()?;

    let server_ca_manager = ServerCaManagerBuilder::new(
        server_config.root_cert_file_path.clone(),
        server_config.root_key_file_path.clone(),
    )
    .build()?;

    let mut proxy_server_builder = ProxyServerBuilder::default();

    proxy_server_builder
        .config(Arc::new(server_config))
        .server_ca_manager(Arc::new(server_ca_manager))
        .data_dir(run_dir.join("db"));
    if let Some(custom_certs) = custom_certs {
        proxy_server_builder.custom_certs(custom_certs.clone());
        proxy_server_builder.api_custom_certs(custom_certs);
    }

    let proxy_server = proxy_server_builder.build().await?;
    Ok(proxy_server)
}
