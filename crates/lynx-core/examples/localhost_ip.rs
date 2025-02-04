use local_ip_address::list_afinet_netifas;

fn main() {
    let network_interfaces = list_afinet_netifas().unwrap();

    for (name, ip) in network_interfaces.iter() {
        if ip.is_ipv4() {
            println!("{}:\t{:?}", name, ip);
        }
    }
}
