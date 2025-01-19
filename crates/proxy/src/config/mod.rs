use std::{fs, path::PathBuf};

use derive_builder::Builder;
use once_cell::sync::OnceCell;
use tracing::debug;

#[derive(Builder, Debug, Default)]
pub struct AppConfig {
    pub asserts_root_dir: PathBuf,
    pub ca_root_dir: PathBuf,
    pub raw_root_dir: PathBuf,
    pub db_root_dir: PathBuf,
}

impl AppConfig {
    pub fn get_root_ca_path(&self) -> PathBuf {
        self.ca_root_dir.join("root_ca.pem")
    }
    pub fn get_root_ca_key(&self) -> PathBuf {
        self.ca_root_dir.join("root_ca.key")
    }
    pub fn get_db_path(&self) -> PathBuf {
        self.db_root_dir.join("proxy.sqlite")
    }
}

pub static APP_CONFIG: OnceCell<AppConfig> = OnceCell::new();

pub fn init_config() -> AppConfig {
    // #[cfg(not(test))]
    // let default_asserts_root_dir = dirs::home_dir()
    //     .expect("can not get home dir")
    //     .join(format!(".config/{}", env!("CARGO_PKG_NAME")));
    let default_asserts_root_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("asserts");

    let default_ca_root_dir = default_asserts_root_dir.join("ca");
    let default_raw_root_dir = default_asserts_root_dir.join("raw");
    let default_db_root_dir = default_asserts_root_dir.join("db");

    let config = AppConfigBuilder::create_empty()
        .asserts_root_dir(default_asserts_root_dir)
        .ca_root_dir(default_ca_root_dir)
        .db_root_dir(default_db_root_dir)
        .raw_root_dir(default_raw_root_dir)
        .build()
        .expect("init asserts dir error");

    config
}

pub fn set_up_config_dir() -> AppConfig {
    let config = init_config();
    create_dir_if_not_exists(&config.asserts_root_dir);
    create_dir_if_not_exists(&config.ca_root_dir);
    create_dir_if_not_exists(&config.db_root_dir);
    create_dir_if_not_exists(&config.raw_root_dir);
    config
}

pub fn create_dir_if_not_exists(dir: &PathBuf) {
    if !fs::exists(dir)
        .unwrap_or_else(|_| panic!("can't check existence of {}", &dir.to_string_lossy()))
    {
        fs::create_dir(dir).unwrap_or_else(|_| panic!("can't create {}", &dir.to_string_lossy()));
        debug!("create dir {}", &dir.to_string_lossy());
    }
    debug!("dir {} exists", &dir.to_string_lossy());
}

#[test]
fn test_init_config() {
    set_up_config_dir();
}

// pub fn get_app_config(){
//     return APP_CONFIG.get_or_init(||{

//     })
// }
