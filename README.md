# lynx proxy

`lynx proxy` is a high-performance, flexible proxy tool built using the Rust programming language. It aims to provide efficient HTTP/HTTPS proxy services, supporting various features and configuration options suitable for different network environments and needs.

## Features

- **High Performance**: Leveraging Rust's performance and safety features.
- **HTTP/HTTPS Support**: Proxy both HTTP and HTTPS traffic.

## Installation

To install the necessary dependencies and set up the environment, run the following command:

```sh
cargo install sea-orm-cli
```

## Usage

To start the proxy server, use the following command:

```sh
cargo run --release
```

You can configure the proxy by editing the `config.toml` file. Here is an example configuration:

```toml
[server]
host = "127.0.0.1"
port = 8080

[logging]
level = "info"
file = "proxy.log"
```

## Contributing

We welcome contributions! Please follow these steps to contribute:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Make your changes.
4. Commit your changes (`git commit -am 'Add new feature'`).
5. Push to the branch (`git push origin feature-branch`).
6. Create a new Pull Request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For any questions or feedback, please open an issue on GitHub.

## Status

This project is currently a work in progress. New features and improvements are being added regularly. Stay tuned for updates!