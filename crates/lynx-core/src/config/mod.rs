use std::{fs, path::PathBuf};

use derive_builder::Builder;
use include_dir::Dir;
use tracing::debug;

#[derive(Builder, Debug, Default, Clone)]
pub struct AppConfig {
    pub assets_ui_root_dir: Option<Dir<'static>>,
    pub assets_root_dir: PathBuf,
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

#[derive(Debug, Default)]
pub struct InitAppConfigParams {
    pub assets_ui_root_dir: Option<Dir<'static>>,
    pub root_dir: Option<PathBuf>,
}

pub fn set_up_config_dir(init_params: InitAppConfigParams) -> AppConfig {
    let default_assets_root_dir = if let Some(root_dir) = init_params.root_dir {
        root_dir
    } else {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("assets")
    };

    let default_ca_root_dir = default_assets_root_dir.join("ca");
    let default_raw_root_dir = default_assets_root_dir.join("raw");
    let default_db_root_dir = default_assets_root_dir.join("db");

    let config = AppConfigBuilder::create_empty()
        .assets_root_dir(default_assets_root_dir)
        .ca_root_dir(default_ca_root_dir)
        .db_root_dir(default_db_root_dir)
        .raw_root_dir(default_raw_root_dir)
        .assets_ui_root_dir(init_params.assets_ui_root_dir)
        .build()
        .expect("init assets dir error");

    create_dir_if_not_exists(&config.assets_root_dir);
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

pub const REQ_DIR: &str = "req";
pub const RES_DIR: &str = "res";
