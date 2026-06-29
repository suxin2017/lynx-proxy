use std::fs;
use std::io::Cursor;
use std::path::Path;

use anyhow::{Context, Result, anyhow};
use sha2::{Digest, Sha256};

/// Common Name of the Lynx root CA certificate.
pub const CA_COMMON_NAME: &str = "lynxProxy";

/// Compute the SHA-256 fingerprint (hex, uppercase) of the first PEM certificate in `path`.
pub fn cert_sha256_fingerprint(path: &Path) -> Result<String> {
    let pem =
        fs::read(path).with_context(|| format!("failed to read certificate {}", path.display()))?;
    cert_sha256_fingerprint_from_pem(&pem)
}

/// Compute the SHA-256 fingerprint (hex, uppercase) from PEM bytes.
pub fn cert_sha256_fingerprint_from_pem(pem: &[u8]) -> Result<String> {
    let der = first_cert_der_from_pem(pem)?;
    Ok(hex_fingerprint::<Sha256>(&der))
}

fn first_cert_der_from_pem(pem: &[u8]) -> Result<Vec<u8>> {
    let mut cursor = Cursor::new(pem);
    let item = rustls_pemfile::read_one(&mut cursor)
        .map_err(|e| anyhow!("failed to parse PEM: {e}"))?
        .ok_or_else(|| anyhow!("no certificate found in PEM"))?;

    match item {
        rustls_pemfile::Item::X509Certificate(der) => Ok(der.to_vec()),
        _ => Err(anyhow!("PEM does not contain an X509 certificate")),
    }
}

fn hex_fingerprint<D: Digest>(der: &[u8]) -> String {
    let digest = D::digest(der);
    digest.iter().map(|byte| format!("{byte:02X}")).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use rcgen::Certificate;
    use rcgen::{BasicConstraints, CertificateParams, DnType, IsCa, KeyPair};

    fn sample_ca_pem() -> Vec<u8> {
        let key = KeyPair::generate().unwrap();
        let mut params = CertificateParams::default();
        params.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
        params
            .distinguished_name
            .push(DnType::CommonName, CA_COMMON_NAME);
        let cert: Certificate = params.self_signed(&key).unwrap();
        cert.pem().into_bytes()
    }

    #[test]
    fn fingerprint_is_stable_and_uppercase() {
        let pem = sample_ca_pem();
        let fp1 = cert_sha256_fingerprint_from_pem(&pem).unwrap();
        let fp2 = cert_sha256_fingerprint_from_pem(&pem).unwrap();
        assert_eq!(fp1, fp2);
        assert_eq!(fp1.len(), 64);
        assert!(
            fp1.chars()
                .all(|c| c.is_ascii_hexdigit() && !c.is_lowercase())
        );
    }
}
