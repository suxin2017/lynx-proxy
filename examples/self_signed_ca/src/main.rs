use std::{env, fs};

use rcgen::{CertifiedKey, generate_simple_self_signed};

fn main() {
    let args: Vec<String> = env::args().collect();
    dbg!(args);

    let current_dir = env::current_dir();
    println!("Current directory: {:?}", current_dir);

    fs::create_dir_all("self_signed_certs").unwrap();

    let subject_alt_names = vec!["localhost".to_string(),"127.0.0.1".to_string()];

    let CertifiedKey { cert, key_pair } = generate_simple_self_signed(subject_alt_names).unwrap();
    fs::write("self_signed_certs/cert.pem", cert.pem()).unwrap();
    fs::write("self_signed_certs/key.pem", key_pair.serialize_pem()).unwrap();
}
