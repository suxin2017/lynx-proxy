use anyhow::{anyhow, Context, Result};
use http::uri::Authority;
use moka::future::Cache;
use rand::{rngs::OsRng, thread_rng, Rng};
use rcgen::{
    BasicConstraints, Certificate, CertificateParams, DnType, ExtendedKeyUsagePurpose, Ia5String,
    IsCa, KeyPair, KeyUsagePurpose, SanType,
};
use rsa::{pkcs8::EncodePrivateKey, RsaPrivateKey};
use std::{fs, io::Cursor, path::Path, sync::Arc};
use time::{Duration, OffsetDateTime};
use tokio_rustls::rustls::{
    pki_types::{CertificateDer, PrivateKeyDer},
    ServerConfig,
};

use std::sync::LazyLock;

pub static CERT_MANAGER: LazyLock<CertificateAuthority> = LazyLock::new(|| {
    let ca_cert_file = Path::new("ca.cert");
    let private_key_file = Path::new("ca.key");

    init_ca(ca_cert_file, private_key_file).unwrap()
});

const TTL_SECS: i64 = 365 * 24 * 60 * 60;
const CACHE_TTL: u64 = TTL_SECS as u64 / 2;
const NOT_BEFORE_OFFSET: i64 = 60;

pub fn init_ca<T: AsRef<Path>>(
    ca_cert_file: T,
    private_key_file: T,
) -> Result<CertificateAuthority> {
    let ca_cert_file = ca_cert_file.as_ref();
    let private_key_file = private_key_file.as_ref();
    let (private_key, ca_cert, ca_data) = if !ca_cert_file.exists() {
        let private_key = gen_private_key().with_context(|| "Failed to generate private key")?;
        let ca_cert =
            gen_ca_cert(&private_key).with_context(|| "Failed to generate CA certificate")?;
        fs::write(ca_cert_file, ca_cert.pem()).with_context(|| {
            format!(
                "Failed to save CA certificate to '{}'",
                ca_cert_file.display()
            )
        })?;
        fs::write(private_key_file, private_key.serialize_pem()).with_context(|| {
            format!(
                "Failed to save private key to '{}'",
                private_key_file.display()
            )
        })?;
        let ca_data = ca_cert.pem();
        (private_key, ca_cert, ca_data)
    } else {
        let private_key_err = || {
            format!(
                "Failed to read private key at '{}'",
                private_key_file.display()
            )
        };
        let private_key_data =
            fs::read_to_string(private_key_file).with_context(private_key_err)?;
        let private_key = KeyPair::from_pem(&private_key_data).with_context(private_key_err)?;
        let ca_err = || {
            format!(
                "Failed to read CA certificate at '{}'",
                ca_cert_file.display()
            )
        };
        let ca_data = fs::read_to_string(ca_cert_file).with_context(ca_err)?;
        let ca_params = CertificateParams::from_ca_cert_pem(&ca_data).with_context(ca_err)?;
        let ca_cert = ca_params.self_signed(&private_key).with_context(ca_err)?;
        (private_key, ca_cert, ca_data)
    };

    let mut private_key_reader = Cursor::new(private_key.serialize_pem());
    let private_key_der = rustls_pemfile::read_one(&mut private_key_reader)
        .ok()
        .flatten()
        .and_then(|key| match key {
            rustls_pemfile::Item::Pkcs1Key(key) => Some(PrivateKeyDer::Pkcs1(key)),
            rustls_pemfile::Item::Pkcs8Key(key) => Some(PrivateKeyDer::Pkcs8(key)),
            rustls_pemfile::Item::Sec1Key(key) => Some(PrivateKeyDer::Sec1(key)),
            _ => None,
        })
        .ok_or_else(|| anyhow!("Invalid private key"))?;

    let ca = CertificateAuthority::new(private_key, private_key_der, ca_cert, ca_data, 1_000);
    Ok(ca)
}

pub struct CertificateAuthority {
    private_key: KeyPair,
    private_key_der: PrivateKeyDer<'static>,
    ca_cert: Certificate,
    ca_data: String,
    cache: Cache<Authority, Arc<ServerConfig>>,
}

impl CertificateAuthority {
    pub fn new(
        private_key: KeyPair,
        private_key_der: PrivateKeyDer<'static>,
        ca_cert: Certificate,
        ca_data: String,
        cache_size: u64,
    ) -> Self {
        Self {
            private_key,
            private_key_der,
            ca_cert,
            ca_data,
            cache: Cache::builder()
                .max_capacity(cache_size)
                .time_to_live(std::time::Duration::from_secs(CACHE_TTL))
                .build(),
        }
    }

    pub fn ca_cert_pem(&self) -> String {
        self.ca_data.clone()
    }

    pub async fn gen_server_config(&self, authority: &Authority) -> Result<Arc<ServerConfig>> {
        let certs = vec![self.gen_cert(authority)?];

        let mut server_cfg = ServerConfig::builder()
            .with_no_client_auth()
            .with_single_cert(certs, self.private_key_der.clone_key())?;

        server_cfg.alpn_protocols =
            vec![b"h2".to_vec(), b"http/1.1".to_vec(), b"http/1.0".to_vec()];

        let server_cfg = Arc::new(server_cfg);

        self.cache
            .insert(authority.clone(), Arc::clone(&server_cfg))
            .await;

        Ok(server_cfg)
    }

    pub fn gen_cert(&self, authority: &Authority) -> Result<CertificateDer<'static>> {
        let mut params = CertificateParams::default();
        params.serial_number = Some(thread_rng().gen::<u64>().into());

        let not_before = OffsetDateTime::now_utc() - Duration::seconds(NOT_BEFORE_OFFSET);
        params.not_before = not_before;
        params.not_after = not_before + Duration::seconds(TTL_SECS);
        params
            .distinguished_name
            .push(DnType::CommonName, authority.host());
        params
            .subject_alt_names
            .push(SanType::DnsName(Ia5String::try_from(authority.host())?));

        let cert = params.signed_by(&self.private_key, &self.ca_cert, &self.private_key)?;
        let cert_der = cert.der().clone();
        Ok(cert_der)
    }
}

fn gen_ca_cert(key: &KeyPair) -> Result<Certificate> {
    let mut params = CertificateParams::default();
    let (yesterday, tomorrow) = validity_period();
    params.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
    params
        .distinguished_name
        .push(DnType::CommonName, "myproxyfor");
    params
        .distinguished_name
        .push(DnType::OrganizationName, "myproxyfor");
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

fn gen_private_key() -> Result<KeyPair> {
    let mut rng = OsRng;
    let bits = 2048;
    let private_key = RsaPrivateKey::new(&mut rng, bits)?;
    let private_key_der = private_key.to_pkcs8_der()?;
    let private_key = KeyPair::try_from(private_key_der.as_bytes())?;
    Ok(private_key)
}

fn validity_period() -> (OffsetDateTime, OffsetDateTime) {
    let day = Duration::days(3650);
    let yesterday = OffsetDateTime::now_utc().checked_sub(day).unwrap();
    let tomorrow = OffsetDateTime::now_utc().checked_add(day).unwrap();
    (yesterday, tomorrow)
}

#[tokio::test]
async fn ca_test() {
    let authority = Authority::from_static("www.baidu.com");
    // dbg!(&CERT_MANAGER.ca_data);
    match CERT_MANAGER.gen_server_config(&authority).await {
        Ok(server_config) => server_config,
        Err(err) => {
            eprintln!("Failed to build server config: {err}");
            return;
        }
    };
}
