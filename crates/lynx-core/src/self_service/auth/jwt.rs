use std::time::{SystemTime, UNIX_EPOCH};

use jsonwebtoken::{Algorithm, Header, Validation, decode, encode};
use serde::{Deserialize, Serialize};

use super::AuthConfig;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: u64,
    pub iat: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub jti: Option<String>,
}

impl AuthConfig {
    pub fn issue_token(&self, subject: &str) -> Result<(String, u64), jsonwebtoken::errors::Error> {
        let now = now_secs();
        let exp = now + self.token_ttl.as_secs();
        let claims = Claims {
            sub: subject.to_string(),
            exp,
            iat: now,
            jti: Some(nanoid::nanoid!()),
        };
        let token = encode(&Header::new(Algorithm::HS256), &claims, self.encoding_key())?;
        Ok((token, exp))
    }

    pub fn validate_token(&self, token: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
        let mut validation = Validation::new(Algorithm::HS256);
        validation.validate_exp = true;
        let data = decode::<Claims>(token, self.decoding_key(), &validation)?;
        Ok(data.claims)
    }
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}
