use std::{fs, path::PathBuf};

use rcgen::{CertifiedKey, generate_simple_self_signed};

fn main() {
    let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
    fs::create_dir_all(manifest_dir.join("dist")).unwrap();

    let subject_alt_names = vec!["localhost".to_string(), "127.0.0.1".to_string()];

    let CertifiedKey { cert, key_pair } = generate_simple_self_signed(subject_alt_names).unwrap();
    fs::write(manifest_dir.join("dist/cert.pem"), cert.pem()).unwrap();
    fs::write(manifest_dir.join("dist/key.pem"), key_pair.serialize_pem()).unwrap();
}
