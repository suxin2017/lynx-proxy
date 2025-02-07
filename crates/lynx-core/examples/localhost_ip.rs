use std::net::IpAddr;

use local_ip_address::list_afinet_netifas;

fn main() {
    let network_interfaces = list_afinet_netifas().unwrap();

    let result: Vec<IpAddr> = network_interfaces
        .into_iter()
        .filter(|x| x.1.is_ipv4())
        .map(|x| x.1)
        .collect();
}
