use super::types::AdbDevice;

pub fn parse_devices_output(stdout: &str) -> Vec<AdbDevice> {
    let mut devices = Vec::new();
    for line in stdout.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with("List of devices") {
            continue;
        }
        let Some((serial, rest)) = line.split_once('\t').or_else(|| line.split_once("  ").map(|(a, b)| (a.trim(), b.trim()))) else {
            continue;
        };
        let serial = serial.trim().to_string();
        if serial.is_empty() {
            continue;
        }
        let mut parts = rest.split_whitespace();
        let state = parts.next().unwrap_or("unknown").to_string();
        let mut model = None;
        let mut product = None;
        for token in parts {
            if let Some(value) = token.strip_prefix("model:") {
                model = Some(value.to_string());
            } else if let Some(value) = token.strip_prefix("product:") {
                product = Some(value.to_string());
            }
        }
        devices.push(AdbDevice {
            serial,
            state,
            model,
            product,
        });
    }
    devices
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_typical_devices_l() {
        let out = r"List of devices attached
emulator-5554          device product:sdk_gphone64_x86_64 model:sdk_gphone64_x86_64 device:emulator64 transport_id:1
R58M90ABCDE     unauthorized
";
        let devices = parse_devices_output(out);
        assert_eq!(devices.len(), 2);
        assert_eq!(devices[0].serial, "emulator-5554");
        assert_eq!(devices[0].state, "device");
        assert_eq!(devices[0].model.as_deref(), Some("sdk_gphone64_x86_64"));
        assert_eq!(devices[1].serial, "R58M90ABCDE");
        assert_eq!(devices[1].state, "unauthorized");
    }

    #[test]
    fn parse_empty() {
        assert!(parse_devices_output("List of devices attached\n").is_empty());
    }
}
