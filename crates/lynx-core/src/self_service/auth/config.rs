use std::sync::Arc;
use std::time::Duration;

use anyhow::{Result, anyhow, bail};
use jsonwebtoken::{DecodingKey, EncodingKey};
use sha2::{Digest, Sha256};
use subtle::ConstantTimeEq;

const DEFAULT_TOKEN_TTL_SECS: u64 = 12 * 60 * 60;

#[derive(Clone)]
pub struct AuthConfig {
    pub enabled: bool,
    pub username: String,
    password_hash: [u8; 32],
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
    pub token_ttl: Duration,
}

impl AuthConfig {
    pub fn disabled() -> Arc<Self> {
        let secret = random_secret();
        Arc::new(Self {
            enabled: false,
            username: String::new(),
            password_hash: [0u8; 32],
            encoding_key: EncodingKey::from_secret(secret.as_slice()),
            decoding_key: DecodingKey::from_secret(secret.as_slice()),
            token_ttl: Duration::from_secs(DEFAULT_TOKEN_TTL_SECS),
        })
    }

    pub fn from_credentials(
        username: Option<String>,
        password: Option<String>,
    ) -> Result<Arc<Self>> {
        match (username, password) {
            (None, None) => Ok(Self::disabled()),
            (Some(user), Some(pass)) => {
                let user = user.trim().to_string();
                let pass = pass.trim().to_string();
                if user.is_empty() || pass.is_empty() {
                    bail!("username and password must be non-empty when enabling auth");
                }
                let secret = random_secret();
                Ok(Arc::new(Self {
                    enabled: true,
                    username: user,
                    password_hash: hash_password(&pass),
                    encoding_key: EncodingKey::from_secret(secret.as_slice()),
                    decoding_key: DecodingKey::from_secret(secret.as_slice()),
                    token_ttl: Duration::from_secs(DEFAULT_TOKEN_TTL_SECS),
                }))
            }
            _ => Err(anyhow!(
                "both username and password are required to enable auth (use --user/-u and --pass/-p)"
            )),
        }
    }

    pub fn verify_password(&self, password: &str) -> bool {
        if !self.enabled {
            return false;
        }
        let candidate = hash_password(password);
        candidate.ct_eq(&self.password_hash).into()
    }

    pub fn encoding_key(&self) -> &EncodingKey {
        &self.encoding_key
    }

    pub fn decoding_key(&self) -> &DecodingKey {
        &self.decoding_key
    }
}

fn hash_password(password: &str) -> [u8; 32] {
    let digest = Sha256::digest(password.as_bytes());
    digest.into()
}

fn random_secret() -> Vec<u8> {
    use rand::RngCore;
    let mut secret = vec![0u8; 32];
    rand::thread_rng().fill_bytes(&mut secret);
    secret
}
