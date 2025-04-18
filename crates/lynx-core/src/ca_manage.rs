use std::{fs, path::PathBuf, sync::Arc};

use anyhow::Result;
use http::uri::Authority;
use lynx_cert::{
    gen_cert_by_ca, gen_root_ca_cert, gen_server_config_by_ca, read_cert_and_key_by_file,
};
use moka::future::Cache;
use rcgen::{Certificate, KeyPair};
use tokio_rustls::rustls::ServerConfig;

use crate::config::AppConfig;

const TTL_SECS: i64 = 365 * 24 * 60 * 60;
const CACHE_TTL: u64 = TTL_SECS as u64 / 2;

struct ServerCaManagerBuilder {
    root_cert_file_path: PathBuf,
    root_key_file_path: PathBuf,
}

impl ServerCaManagerBuilder {
    pub fn new(root_cert_file_path: PathBuf, root_key_file_path: PathBuf) -> Self {
        Self {
            root_cert_file_path,
            root_key_file_path,
        }
    }

    pub fn build(&self) -> Result<ServerCaManager> {
        // read_cert_by_file(self.root_cert_file_path)
        let (ca_cert, ca_key) =
            if self.root_cert_file_path.exists() && self.root_key_file_path.exists() {
                read_cert_and_key_by_file(&self.root_key_file_path, &self.root_cert_file_path)?
            } else {
                let (cert, key) = gen_root_ca_cert()?;
                fs::write(&self.root_cert_file_path, cert.pem())?;
                fs::write(&self.root_key_file_path, key.serialize_pem())?;
                (cert, key)
            };

        Ok(ServerCaManager {
            ca_cert,
            ca_key,
            cache: Cache::builder()
                .max_capacity(100)
                .time_to_live(std::time::Duration::from_secs(CACHE_TTL))
                .build(),
        })
    }
}

pub struct ServerCaManager {
    pub ca_cert: Certificate,
    pub ca_key: KeyPair,
    pub cache: Cache<Authority, Arc<ServerConfig>>,
}

impl ServerCaManager {
    pub async fn get_server_config(&self, authority: &Authority) -> Result<Arc<ServerConfig>> {
        let server_config = self
            .cache
            .get_with(authority.clone(), async move {
                let server_config = || {
                    let authority_cert =
                        gen_cert_by_ca(&self.ca_cert, &self.ca_key, authority.host().into())?;
                    let server_config =
                        gen_server_config_by_ca(&[Arc::new(authority_cert)], &self.ca_key)?;
                    let server_config = Arc::new(server_config);
                    Ok::<Arc<_>, anyhow::Error>(server_config)
                };

                match server_config() {
                    Ok(config) => config,
                    Err(e) => {
                        panic!("Failed to generate server config: {:#}", e.backtrace());
                    }
                }
            })
            .await;

        Ok(server_config)
    }
}

pub fn set_up_ca_manager(app_config: &AppConfig) -> ServerCaManager {
    let ca_cert_file = app_config.get_root_ca_path();
    let private_key_file = app_config.get_root_ca_key();

    ServerCaManagerBuilder::new(ca_cert_file, private_key_file)
        .build()
        .expect("Failed to create CA manager")
}

#[cfg(test)]
mod tests {
    use super::*;

    use tempdir::TempDir;

    fn get_temp_dir() -> TempDir {
        TempDir::new("lynx_ca_manager").unwrap()
    }

    #[test]
    fn create_ca_manager() {
        let temp_dir = get_temp_dir();
        let ca_manager = ServerCaManagerBuilder::new(
            temp_dir.path().join("test_cert.pem"),
            temp_dir.path().join("test_key.pem"),
        )
        .build();

        assert!(ca_manager.is_ok());
    }

    #[tokio::test]
    async fn create_server_config_by_ca_manager() {
        let temp_dir = get_temp_dir();
        let ca_manager = ServerCaManagerBuilder::new(
            temp_dir.path().join("test_cert.pem"),
            temp_dir.path().join("test_key.pem"),
        )
        .build();

        assert!(ca_manager.is_ok());

        let ca_manager = ca_manager.unwrap();
        let authority = Authority::from_static("example.com:443");
        let server_config = ca_manager.get_server_config(&authority).await;
        assert!(server_config.is_ok());
    }
}
