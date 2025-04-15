use std::{
    fs,
    io::{self, Cursor},
    net::IpAddr,
    path::PathBuf,
};

use anyhow::{Ok, Result, anyhow};
use rand::{Rng, rngs::OsRng, thread_rng};
use rcgen::{
    BasicConstraints, Certificate, CertificateParams, CertifiedKey, DnType, DnValue,
    ExtendedKeyUsagePurpose, Ia5String, IsCa, KeyPair, KeyUsagePurpose, SanType,
    generate_simple_self_signed,
};
use rsa::{RsaPrivateKey, pkcs8::EncodePrivateKey};
use time::{Duration, OffsetDateTime};
use tokio_rustls::rustls::{
    ClientConfig, RootCertStore, ServerConfig,
    pki_types::{CertificateDer, PrivateKeyDer, pem::PemObject},
};

/// Generate a self-signed certificate and private key for localhost
pub fn get_self_signed_cert(subject_alt_names: Option<Vec<String>>) -> Result<(String, String)> {
    let subject_alt_names =
        subject_alt_names.unwrap_or_else(|| vec!["localhost".to_string(), "127.0.0.1".to_string()]);

    let CertifiedKey { cert, key_pair } = generate_simple_self_signed(subject_alt_names)?;

    Ok((cert.pem(), key_pair.serialize_pem()))
}

fn gen_ca_cert(key: &KeyPair) -> Result<Certificate> {
    let mut params = CertificateParams::default();
    let (yesterday, tomorrow) = validity_period();
    params.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
    params
        .distinguished_name
        .push(DnType::CommonName, "lynxProxy");
    params
        .distinguished_name
        .push(DnType::OrganizationName, "lynxProxy");
    params.not_before = yesterday;
    params.not_after = tomorrow;
    params
        .extended_key_usages
        .push(ExtendedKeyUsagePurpose::ServerAuth);
    params.key_usages.push(KeyUsagePurpose::KeyCertSign);
    params.key_usages.push(KeyUsagePurpose::CrlSign);
    let ca_cert = params.self_signed(key)?;

    Ok(ca_cert)
}

fn validity_period() -> (OffsetDateTime, OffsetDateTime) {
    let day = Duration::days(3650);
    let yesterday = OffsetDateTime::now_utc().checked_sub(day).unwrap();
    let tomorrow = OffsetDateTime::now_utc().checked_add(day).unwrap();
    (yesterday, tomorrow)
}

pub fn gen_ca_private_key() -> Result<KeyPair> {
    let mut rng = OsRng;
    let bits = 2048;
    let private_key = RsaPrivateKey::new(&mut rng, bits)?;
    let private_key_der = private_key.to_pkcs8_der()?;
    let private_key = KeyPair::try_from(private_key_der.as_bytes())?;
    Ok(private_key)
}

pub fn create_ca_cert_and_key() -> Result<(Certificate, KeyPair)> {
    let private_key = gen_ca_private_key()?;
    let ca_cert = gen_ca_cert(&private_key)?;
    Ok((ca_cert, private_key))
}

const TTL_SECS: i64 = 365 * 24 * 60 * 60;
const NOT_BEFORE_OFFSET: i64 = 60;

#[derive(Debug)]
pub enum HostType {
    DnsName(String),
    IpAddress(IpAddr),
}

impl From<&str> for HostType {
    fn from(host: &str) -> Self {
        if let Result::Ok(ip) = host.parse::<IpAddr>() {
            HostType::IpAddress(ip)
        } else {
            HostType::DnsName(host.to_string())
        }
    }
}

impl From<&HostType> for DnValue {
    fn from(value: &HostType) -> Self {
        match value {
            HostType::DnsName(host) => DnValue::from(host),
            HostType::IpAddress(ip) => DnValue::from(ip.to_string()),
        }
    }
}

pub fn gen_cert_by_ca(
    ca_cert: &Certificate,
    ca_key: &KeyPair,
    host: HostType,
) -> Result<Certificate> {
    let mut params = CertificateParams::default();
    params.serial_number = Some(thread_rng().r#gen::<u64>().into());

    let not_before = OffsetDateTime::now_utc() - Duration::seconds(NOT_BEFORE_OFFSET);
    params.not_before = not_before;
    params.not_after = not_before + Duration::seconds(TTL_SECS);

    params.distinguished_name.push(DnType::CommonName, &host);

    let subject_alt_name = match host {
        HostType::DnsName(host) => SanType::DnsName(Ia5String::try_from(host)?),
        HostType::IpAddress(ip) => SanType::IpAddress(ip),
    };

    params.subject_alt_names.push(subject_alt_name);

    let cert = params.signed_by(ca_key, ca_cert, ca_key)?;

    Ok(cert)
}

pub fn gen_server_config_by_ca(
    cert_chain: &[Certificate],
    ca_key: &KeyPair,
) -> Result<ServerConfig> {
    let mut ca_key_cursor = Cursor::new(ca_key.serialize_pem());

    let key_der = rustls_pemfile::read_one(&mut ca_key_cursor)
        .ok()
        .flatten()
        .and_then(|key| match key {
            rustls_pemfile::Item::Pkcs1Key(key) => Some(PrivateKeyDer::Pkcs1(key)),
            rustls_pemfile::Item::Pkcs8Key(key) => Some(PrivateKeyDer::Pkcs8(key)),
            rustls_pemfile::Item::Sec1Key(key) => Some(PrivateKeyDer::Sec1(key)),
            _ => None,
        })
        .ok_or_else(|| anyhow!("Invalid private key"))?;

    let cert_chain = cert_chain
        .iter()
        .map(|cert| cert.der().to_owned())
        .collect();
    let server_config = ServerConfig::builder()
        .with_no_client_auth()
        .with_single_cert(cert_chain, key_der)?;

    Ok(server_config)
}

pub fn gen_client_config_by_cert(cert_chain: Option<&[Certificate]>) -> Result<ClientConfig> {
    let mut root_cert_store: RootCertStore = RootCertStore::empty();
    // add webpki roots
    root_cert_store.extend(webpki_roots::TLS_SERVER_ROOTS.iter().cloned());

    if let Some(cert_chain) = cert_chain {
        for cert in cert_chain {
            root_cert_store.add(cert.der().to_owned())?;
        }
    }

    let client_config = ClientConfig::builder()
        .with_root_certificates(root_cert_store)
        .with_no_client_auth();

    Ok(client_config)
}

pub fn read_cert_by_file(key: &KeyPair, path: &PathBuf) -> Result<Certificate> {
    let ca_data = fs::read_to_string(path)?;
    let ca_params = CertificateParams::from_ca_cert_pem(&ca_data)?;
    let ca_cert = ca_params.self_signed(key)?;
    Ok(ca_cert)
}

pub fn read_cert_key_by_file(path: &PathBuf) -> Result<KeyPair> {
    let pem_key = fs::read_to_string(path)?;
    let key = KeyPair::from_pem(&pem_key)?;
    Ok(key)
}

pub fn read_cert_and_key_by_file(
    key_path: &PathBuf,
    cert_path: &PathBuf,
) -> Result<(Certificate, KeyPair)> {
    let ca_key = read_cert_key_by_file(key_path)?;
    let ca_cert = read_cert_by_file(&ca_key, cert_path)?;
    Ok((ca_cert, ca_key))
}

pub fn write_cert_to_file(ca_cert: Certificate, path: PathBuf) -> Result<()> {
    fs::write(path, ca_cert.pem())?;
    Ok(())
}

pub fn write_key_to_file(key: KeyPair, path: PathBuf) -> Result<()> {
    fs::write(path, key.serialize_pem())?;
    Ok(())
}

pub fn gen_root_ca_cert() -> Result<(Certificate, KeyPair)> {
    let private_key = gen_ca_private_key()?;
    let ca_cert = gen_ca_cert(&private_key)?;
    Ok((ca_cert, private_key))
}
