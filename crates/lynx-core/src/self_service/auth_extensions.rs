use std::sync::Arc;

use http::Extensions;

use super::auth::AuthConfig;

pub trait AuthConfigExtensionsExt {
    fn get_auth_config(&self) -> Arc<AuthConfig>;
}

impl AuthConfigExtensionsExt for Extensions {
    fn get_auth_config(&self) -> Arc<AuthConfig> {
        self.get::<Arc<AuthConfig>>()
            .cloned()
            .unwrap_or_else(AuthConfig::disabled)
    }
}
