# Lynx Proxy

[English](README.md) | Simplified Chinese

[![Crates.io License](https://img.shields.io/crates/l/lynx-core)](./LICENSE)
[![Crates](https://img.shields.io/crates/v/lynx-core.svg)](https://crates.io/crates/lynx-core)

Lynx Proxy is a high-performance, flexible proxy tool built using the Rust programming language. It aims to provide efficient HTTP/HTTPS proxy services, supporting multiple features and configuration options, suitable for different network environments and requirements.

# Features

- High Performance: Leverages Rust's performance and safety features.
- HTTP/HTTPS Support: Proxies HTTP and HTTPS traffic.

# Installation

## Bash

```
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/suxin2017/lynx/releases/latest/download/lynx-cli-installer.sh | sh
```

# Usage

```
# start server
lynx-cli
```

```
A proxy service

Usage: lynx-cli [OPTIONS]

Options:
  -p, --port <PORT>            proxy server port [default: 3000]
      --only-localhost         only allow localhost access
      --log-level <LOG_LEVEL>  log level [default: silent] [possible values: silent, info, error, debug, trace]
      --data-dir <DATA_DIR>    data dir if not set, use default data dir
  -h, --help                   Print help
  -V, --version                Print version
```

# Contribution

We welcome your contributions! Please follow these steps to contribute:

- Fork the repository.
- Create a new branch (git checkout -b feature-branch).
- Install necessary dependencies
  - Install [taskfile](https://taskfile.dev/)
  - Install(Optional) [cargo-release](https://crates.io/crates/cargo-release)
  - Install(Optional) [git-cliff](https://git-cliff.org/docs/)
  - Install UI-related dependencies
    ```bash
    task setup-ui
    ```
  - Start the service
    ```bash
    task dev
    ```
- Make your changes.
- Commit your changes (git commit -am 'Add new feature').
- Push your changes to the branch (git push origin feature-branch).
- Create a new Pull Request.

# License

This project is licensed under the MIT License. For more details, please refer to the [LICENSE](LICENSE) file.

# Contact

If you have any questions or feedback, please submit an issue on GitHub.

# Status

This project is still under development. We are regularly adding new features and improvements. Stay tuned for updates!
