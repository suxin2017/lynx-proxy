pub mod common;

use common::{
    build_proxy_client::build_http_proxy_client, start_http_server::start_http_server_with_port,
    test_server::HELLO_PATH, tracing_config::init_tracing,
};
use proxy_server::{server::Server, server_context::set_up_context};

#[tokio::test]
#[ignore]
async fn start_test_server() {
    init_tracing();
    let addr: std::net::SocketAddr = start_http_server_with_port(3002).await.unwrap();
    set_up_context().await;

    let mut proxy_server = Server::new(3000);
    proxy_server.run().await.unwrap();
    let proxy_addr = proxy_server.access_addr_list.first().unwrap().to_string();

    // internal send request
    // tokio::spawn(async move {
    //     let client = build_http_proxy_client(&proxy_addr);
    //     let mut interval = tokio::time::interval(std::time::Duration::from_secs(5));
    //     loop {
    //         interval.tick().await;
    //         let data = client
    //             .get(format!("http://{addr}{}", HELLO_PATH))
    //             .send()
    //             .await
    //             .unwrap();
    //         data.text().await.unwrap();
    //     }
    // });

    tokio::signal::ctrl_c().await.unwrap();
}
