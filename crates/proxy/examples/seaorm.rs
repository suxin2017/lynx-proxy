use std::time::{SystemTime, UNIX_EPOCH};

fn get_current_timestamp() -> u64 {
    let start = SystemTime::now();
    let since_the_epoch = start.duration_since(UNIX_EPOCH)
        .expect("Time went backwards");
    since_the_epoch.as_secs()
}

fn get_current_timestamp_millis() -> u128 {
    let start = SystemTime::now();
    let since_the_epoch = start.duration_since(UNIX_EPOCH)
        .expect("Time went backwards");
    since_the_epoch.as_millis()
}

fn main() {
    let timestamp = get_current_timestamp();
    println!("Current timestamp (seconds): {}", timestamp);

    let timestamp_millis = get_current_timestamp_millis();
    println!("Current timestamp (milliseconds): {}", timestamp_millis);
}