use once_cell::sync::OnceCell;
use sea_orm::DatabaseConnection;

use crate::{
    cert::{set_up_ca_manager, CertificateAuthority},
    config::{set_up_config_dir, AppConfig},
    entities::set_up_db,
};

pub static APP_CONFIG: OnceCell<AppConfig> = OnceCell::new();
pub static CA_MANAGER: OnceCell<CertificateAuthority> = OnceCell::new();
pub static DB: OnceCell<DatabaseConnection> = OnceCell::new();

// Set up the context for the server
pub async fn set_up_context() {
    let app_config = set_up_config_dir();
    CA_MANAGER.get_or_init(|| set_up_ca_manager(&app_config));
    let db = set_up_db(&app_config).await;
    DB.get_or_init(|| db);
    APP_CONFIG.get_or_init(|| app_config.clone());
}
