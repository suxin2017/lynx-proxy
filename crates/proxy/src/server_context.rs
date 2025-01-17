use sea_orm::DatabaseConnection;

use crate::{
    cert::{set_up_ca_manager, CertificateAuthority},
    config::{set_up_config_dir, AppConfig},
    entities::set_up_db,
};

pub struct ServerContext {
    db: DatabaseConnection,
    ca_manager: CertificateAuthority,
    app_config: AppConfig,
}

pub async fn set_up_context() -> ServerContext {
    let app_config = set_up_config_dir();
    let ca_manager = set_up_ca_manager(&app_config);
    let db = set_up_db(&app_config).await;

    
    ServerContext {
        db,
        ca_manager,
        app_config,
    }
}