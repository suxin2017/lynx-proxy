use once_cell::sync::OnceCell;
use sea_orm::DatabaseConnection;

use crate::{
    // cert::{CertificateAuthority, set_up_ca_manager},
    config::{AppConfig, InitAppConfigParams},
    proxy_server::server_ca_manage::ServerCaManager,
};

pub static APP_CONFIG: OnceCell<AppConfig> = OnceCell::new();
pub static CA_MANAGER: OnceCell<ServerCaManager> = OnceCell::new();
pub static DB: OnceCell<DatabaseConnection> = OnceCell::new();

#[derive(Debug, Default)]
pub struct InitContextParams {
    pub init_app_config_params: InitAppConfigParams,
}

pub fn get_db_connect() -> &'static DatabaseConnection {
    DB.get().unwrap()
}

pub fn get_app_config() -> &'static AppConfig {
    APP_CONFIG.get().unwrap()
}

pub fn get_ca_manager() -> &'static ServerCaManager {
    CA_MANAGER.get().unwrap()
}
