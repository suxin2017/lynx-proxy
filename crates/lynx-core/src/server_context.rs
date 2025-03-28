use once_cell::sync::OnceCell;
use sea_orm::DatabaseConnection;

use crate::{
    cert::{CertificateAuthority, set_up_ca_manager},
    config::{AppConfig, InitAppConfigParams, set_up_config_dir},
    entities::set_up_db,
};

pub static APP_CONFIG: OnceCell<AppConfig> = OnceCell::new();
pub static CA_MANAGER: OnceCell<CertificateAuthority> = OnceCell::new();
pub static DB: OnceCell<DatabaseConnection> = OnceCell::new();

#[derive(Debug, Default)]
pub struct InitContextParams {
    pub init_app_config_params: InitAppConfigParams,
}

// Set up the context for the server
pub async fn set_up_context(init_context_params: InitContextParams) {
    let app_config = set_up_config_dir(init_context_params.init_app_config_params);
    CA_MANAGER.get_or_init(|| set_up_ca_manager(&app_config));
    let db = set_up_db(&app_config).await;
    DB.get_or_init(|| db);
    APP_CONFIG.get_or_init(|| app_config.clone());
}

pub fn get_db_connect() -> &'static DatabaseConnection {
    DB.get().unwrap()
}
