use std::path::{Path, PathBuf};
use std::process::Command;

use anyhow::{Context, Result, bail};
use lynx_cert::CA_COMMON_NAME;

/// System keychain path on macOS.
pub fn system_keychain_path() -> PathBuf {
    PathBuf::from("/Library/Keychains/System.keychain")
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct KeychainCertificate {
    pub sha1: String,
    pub sha256: String,
}

/// Find all `lynxProxy` certificates in the System keychain.
pub fn find_certificates() -> Result<Vec<KeychainCertificate>> {
    let keychain = system_keychain_path();
    let output = Command::new("security")
        .args([
            "find-certificate",
            "-c",
            CA_COMMON_NAME,
            "-a",
            "-Z",
            keychain.to_string_lossy().as_ref(),
        ])
        .output()
        .context("failed to run security find-certificate")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("could not be found") || stderr.contains("SecItemCopyMatching") {
            return Ok(Vec::new());
        }
        bail!(
            "security find-certificate failed: {}",
            stderr.trim()
        );
    }

    Ok(parse_find_certificate_output(&String::from_utf8_lossy(
        &output.stdout,
    )))
}

pub fn install_certificate(cert_path: &Path) -> Result<()> {
    let keychain = system_keychain_path();
    let output = Command::new("security")
        .args([
            "add-trusted-cert",
            "-d",
            "-r",
            "trustRoot",
            "-k",
            keychain.to_string_lossy().as_ref(),
            cert_path.to_string_lossy().as_ref(),
        ])
        .output()
        .context("failed to run security add-trusted-cert")?;

    if output.status.success() {
        return Ok(());
    }

    let stderr = String::from_utf8_lossy(&output.stderr);
    if stderr.contains("User interaction is not allowed")
        || stderr.contains("authorization")
        || stderr.contains("-25293")
        || stderr.contains("Write permissions error")
        || stderr.contains("SecCertificateAddToKeychain")
    {
        bail!(
            "security add-trusted-cert failed: {}\nInstalling into System Keychain requires administrator authorization. Try running with sudo.",
            stderr.trim()
        );
    }

    bail!(
        "security add-trusted-cert failed: {}",
        stderr.trim()
    );
}

pub fn delete_certificate(sha1: &str) -> Result<()> {
    let keychain = system_keychain_path();
    let output = Command::new("security")
        .args([
            "delete-certificate",
            "-Z",
            sha1,
            keychain.to_string_lossy().as_ref(),
        ])
        .output()
        .context("failed to run security delete-certificate")?;

    if output.status.success() {
        return Ok(());
    }

    bail!(
        "security delete-certificate failed: {}",
        String::from_utf8_lossy(&output.stderr).trim()
    );
}

/// Parse `security find-certificate -Z` stdout into certificate entries.
pub fn parse_find_certificate_output(output: &str) -> Vec<KeychainCertificate> {
    let mut certs = Vec::new();
    let mut current_sha1 = None::<String>;
    let mut current_sha256 = None::<String>;

    for line in output.lines() {
        let line = line.trim();
        if let Some(value) = line.strip_prefix("SHA-1 hash:") {
            current_sha1 = Some(value.trim().to_string());
        } else if let Some(value) = line.strip_prefix("SHA-256 hash:") {
            current_sha256 = Some(value.trim().to_string());
        }

        if let (Some(sha1), Some(sha256)) = (&current_sha1, &current_sha256) {
            certs.push(KeychainCertificate {
                sha1: sha1.clone(),
                sha256: sha256.clone(),
            });
            current_sha1 = None;
            current_sha256 = None;
        }
    }

    if let (Some(sha1), Some(sha256)) = (current_sha1, current_sha256) {
        certs.push(KeychainCertificate {
            sha1,
            sha256,
        });
    }

    certs
}

fn normalize_fingerprint(value: &str) -> String {
    value
        .chars()
        .filter(|c| c.is_ascii_hexdigit())
        .map(|c| c.to_ascii_uppercase())
        .collect()
}

pub fn fingerprints_match(a: &str, b: &str) -> bool {
    normalize_fingerprint(a) == normalize_fingerprint(b)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_single_certificate() {
        let output = r#"keychain: "/Library/Keychains/System.keychain"
version: 512
class: 0x80001000
attributes:
    "alis"<blob>="lynxProxy"
SHA-1 hash: ABCDEF0123456789ABCDEF0123456789ABCDEF01
SHA-256 hash: 0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF
"#;
        let certs = parse_find_certificate_output(output);
        assert_eq!(certs.len(), 1);
        assert_eq!(certs[0].sha1, "ABCDEF0123456789ABCDEF0123456789ABCDEF01");
        assert_eq!(
            certs[0].sha256,
            "0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF"
        );
    }

    #[test]
    fn parse_multiple_certificates() {
        let output = r#"SHA-1 hash: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
SHA-256 hash: BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB
SHA-1 hash: CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC
SHA-256 hash: DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD
"#;
        let certs = parse_find_certificate_output(output);
        assert_eq!(certs.len(), 2);
        assert_eq!(certs[0].sha1, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
        assert_eq!(certs[1].sha1, "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC");
    }

    #[test]
    fn parse_certificate_with_sha256_first() {
        let output = r#"SHA-256 hash: BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB
SHA-1 hash: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
"#;
        let certs = parse_find_certificate_output(output);
        assert_eq!(certs.len(), 1);
        assert_eq!(certs[0].sha1, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
        assert_eq!(certs[0].sha256, "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB");
    }

    #[test]
    fn parse_empty_output() {
        assert!(parse_find_certificate_output("").is_empty());
    }

    #[test]
    fn fingerprint_match_ignores_case_and_separators() {
        assert!(fingerprints_match(
            "ab:cd:ef",
            "ABCD EF"
        ));
    }
}
