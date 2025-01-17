use std::{
    fs,
    io::{self, Read},
    path::PathBuf,
    sync::LazyLock,
};

use reqwest::Certificate;
use tokio_rustls::rustls::pki_types::{CertificateDer, PrivateKeyDer};

pub static PROXY_ROOT_DIR: LazyLock<PathBuf> =
    LazyLock::new(|| PathBuf::from(env!("CARGO_MANIFEST_DIR")));

pub static FIXTURES_DIR: LazyLock<PathBuf> =
    LazyLock::new(|| PROXY_ROOT_DIR.join("tests/fixtures"));

pub static TEST_ROOT_CA_CERT: LazyLock<Certificate> = LazyLock::new(|| {
    let cert_path: PathBuf = FIXTURES_DIR.join("RootCA.crt");

    let mut buf = Vec::new();
    fs::File::open(cert_path)
        .unwrap()
        .read_to_end(&mut buf)
        .unwrap();
    reqwest::Certificate::from_pem(&buf).unwrap()
});
pub static TEST_ROOT_CA_KEY: LazyLock<PathBuf> = LazyLock::new(|| FIXTURES_DIR.join("RootCA.key"));

pub static TEST_LOCALHOST_CERT: LazyLock<io::Result<Vec<CertificateDer<'static>>>> =
    LazyLock::new(|| {
        let localhost_crt_path = FIXTURES_DIR.join("localhost.crt");
        dbg!(&localhost_crt_path);
        // Open certificate file.
        let cert_file = fs::File::open(localhost_crt_path).unwrap();

        let mut reader = io::BufReader::new(cert_file);

        rustls_pemfile::certs(&mut reader).collect()
    });

pub static TEST_LOCALHOST_KEY: LazyLock<io::Result<PrivateKeyDer<'static>>> = LazyLock::new(|| {
    let filename = FIXTURES_DIR.join("localhost.key");
    // Open keyfile.
    let keyfile = fs::File::open(filename).unwrap();
    let mut reader = io::BufReader::new(keyfile);

    // Load and return a single private key.
    rustls_pemfile::private_key(&mut reader).map(|key| key.unwrap())
});
