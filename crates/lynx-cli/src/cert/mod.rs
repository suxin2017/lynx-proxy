use std::path::{Path, PathBuf};

use anyhow::{Result, bail};
use lynx_core::proxy_server::server_ca_manage::ServerCaManagerBuilder;
use lynx_cert::cert_sha256_fingerprint;

#[cfg(target_os = "macos")]
mod macos;

pub const ROOT_CERT_FILE: &str = "root.pem";
pub const ROOT_KEY_FILE: &str = "key.pem";

/// Ensure `{data_dir}/root.pem` and `key.pem` exist, generating them if missing.
pub fn ensure_root_ca(data_dir: &Path) -> Result<PathBuf> {
    let cert_path = data_dir.join(ROOT_CERT_FILE);
    let key_path = data_dir.join(ROOT_KEY_FILE);
    ServerCaManagerBuilder::new(cert_path.clone(), key_path).build()?;
    Ok(cert_path)
}

pub fn root_cert_path(data_dir: &Path) -> PathBuf {
    data_dir.join(ROOT_CERT_FILE)
}

pub fn cert_fingerprint(cert_path: &Path) -> Result<String> {
    cert_sha256_fingerprint(cert_path)
}

#[cfg(not(target_os = "macos"))]
pub mod platform {
    use std::path::Path;

    use super::*;

    pub fn ensure_supported() -> Result<()> {
        bail!("lynx cert is only supported on macOS in this version");
    }

    pub fn install(_data_dir: &Path) -> Result<()> {
        ensure_supported()
    }

    pub fn uninstall(_data_dir: &Path) -> Result<()> {
        ensure_supported()
    }

    pub fn print_status(_data_dir: &Path) -> Result<()> {
        ensure_supported()
    }
}

#[cfg(target_os = "macos")]
pub mod platform {
    use super::*;
    use crate::cert::macos::{
        KeychainCertificate, delete_certificate, find_certificates, fingerprints_match,
        install_certificate,
    };

    pub fn ensure_supported() -> Result<()> {
        Ok(())
    }

    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum TrustStatus {
        NoCa,
        NotInstalled,
        Installed,
        Mismatch,
    }

    pub struct StatusReport {
        pub status: TrustStatus,
        pub cert_path: PathBuf,
        pub disk_fingerprint: Option<String>,
        pub keychain_certificates: Vec<KeychainCertificate>,
    }

    pub fn evaluate_status(data_dir: &Path) -> Result<StatusReport> {
        let cert_path = root_cert_path(data_dir);
        let disk_fingerprint = if cert_path.exists() {
            Some(cert_fingerprint(&cert_path)?)
        } else {
            None
        };

        let keychain_certificates = find_certificates()?;

        let status = match (&disk_fingerprint, keychain_certificates.is_empty()) {
            (None, _) => TrustStatus::NoCa,
            (Some(_disk_fp), true) => TrustStatus::NotInstalled,
            (Some(disk_fp), false) => {
                if keychain_certificates
                    .iter()
                    .any(|cert| fingerprints_match(&cert.sha256, disk_fp))
                {
                    TrustStatus::Installed
                } else {
                    TrustStatus::Mismatch
                }
            }
        };

        Ok(StatusReport {
            status,
            cert_path,
            disk_fingerprint,
            keychain_certificates,
        })
    }

    pub fn install(data_dir: &Path) -> Result<()> {
        let cert_path = ensure_root_ca(data_dir)?;
        let disk_fp = cert_fingerprint(&cert_path)?;
        let keychain_certs = find_certificates()?;

        if keychain_certs
            .iter()
            .any(|cert| fingerprints_match(&cert.sha256, &disk_fp))
        {
            println!("Lynx root CA is already trusted in System Keychain.");
            println!("Certificate: {}", cert_path.display());
            println!("SHA-256: {disk_fp}");
            return Ok(());
        }

        if !keychain_certs.is_empty() {
            bail!(
                "System Keychain contains a different lynxProxy certificate. \
                 Run `lynx cert uninstall` then `lynx cert install` again."
            );
        }

        install_certificate(&cert_path)?;

        println!("Lynx root CA installed to System Keychain.");
        println!("Certificate: {}", cert_path.display());
        println!("SHA-256: {disk_fp}");
        println!();
        println!("Warning: this root CA can decrypt HTTPS traffic on this machine.");
        println!("System Keychain changes may require browser restart to take effect.");

        Ok(())
    }

    pub fn uninstall(data_dir: &Path) -> Result<()> {
        let cert_path = root_cert_path(data_dir);
        let target_fp = if cert_path.exists() {
            Some(cert_fingerprint(&cert_path)?)
        } else {
            None
        };

        let keychain_certs = find_certificates()?;
        if keychain_certs.is_empty() {
            println!("Lynx root CA is not installed in System Keychain.");
            return Ok(());
        }

        let to_remove: Vec<&KeychainCertificate> = match &target_fp {
            Some(fp) => keychain_certs
                .iter()
                .filter(|cert| fingerprints_match(&cert.sha256, fp))
                .collect(),
            None => Vec::new(),
        };

        if target_fp.is_some() && to_remove.is_empty() {
            println!(
                "No matching lynxProxy certificate found in System Keychain for the current root.pem."
            );
            return Ok(());
        }

        if target_fp.is_none() {
            bail!(
                "root.pem not found at {}. Cannot determine which Keychain entry to remove.",
                cert_path.display()
            );
        }

        for cert in to_remove {
            delete_certificate(&cert.sha1)?;
        }

        println!("Removed Lynx root CA from System Keychain.");
        if cert_path.exists() {
            println!("Certificate file: {}", cert_path.display());
        }

        Ok(())
    }

    pub fn print_status(data_dir: &Path) -> Result<()> {
        let report = evaluate_status(data_dir)?;

        match report.status {
            TrustStatus::NoCa => {
                println!("Status: no_ca");
                println!("Certificate: {} (not found)", report.cert_path.display());
            }
            TrustStatus::NotInstalled => {
                println!("Status: not_installed");
                println!("Certificate: {}", report.cert_path.display());
                if let Some(fp) = &report.disk_fingerprint {
                    println!("SHA-256 (disk): {fp}");
                }
                println!("System Keychain: lynxProxy not trusted");
            }
            TrustStatus::Installed => {
                println!("Status: installed");
                println!("Certificate: {}", report.cert_path.display());
                if let Some(fp) = &report.disk_fingerprint {
                    println!("SHA-256 (disk): {fp}");
                }
                if let Some(cert) = report
                    .keychain_certificates
                    .iter()
                    .find(|cert| {
                        report
                            .disk_fingerprint
                            .as_ref()
                            .is_some_and(|fp| fingerprints_match(&cert.sha256, fp))
                    })
                {
                    println!("SHA-256 (keychain): {}", cert.sha256);
                }
            }
            TrustStatus::Mismatch => {
                println!("Status: mismatch");
                println!("Certificate: {}", report.cert_path.display());
                if let Some(fp) = &report.disk_fingerprint {
                    println!("SHA-256 (disk): {fp}");
                }
                for cert in &report.keychain_certificates {
                    println!("SHA-256 (keychain): {}", cert.sha256);
                }
                println!(
                    "System Keychain trusts a different lynxProxy CA than root.pem. \
                     Run `lynx cert uninstall` then `lynx cert install`."
                );
            }
        }

        Ok(())
    }
}
