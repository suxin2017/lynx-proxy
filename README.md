# Lynx Proxy

[简体中文](README.zh-CN.md) | English

[![Crates.io License](https://img.shields.io/crates/l/lynx-core)](./LICENSE)
[![Crates](https://img.shields.io/crates/v/lynx-core.svg)](https://crates.io/crates/lynx-core)

**Lynx Proxy** is a high-performance and flexible proxy tool developed in Rust, designed for efficient handling of HTTP/HTTPS and WebSocket traffic. The project leverages popular Rust networking libraries such as hyper, axum, and tower, and comes with a modern web client (with dark mode support), suitable for various network environments and requirements.

## Features

- 🚀 **High Performance**: Fully utilizes Rust's performance and safety.
- 🌐 **HTTP/HTTPS Support**: Efficiently proxies HTTP and HTTPS traffic.
- 🔗 **WebSocket Support**: Native support for WebSocket proxying.
- 🦀 **Rust Ecosystem**: Built with popular libraries like hyper, axum, and tower.
- 💻 **Modern Web Client**: Intuitive and user-friendly web management interface with dark mode support.
- 📋 **List View**: Support for viewing HTTP requests and responses in a structured list format.
- 🌲 **Tree View**: Visualize your request data in an intuitive tree structure for better organization and analysis.

## Feature Showcase

### HTTP/HTTPS Proxy

![HTTP Proxy Example](./images/http.png)

### WebSocket Proxy

![WebSocket Proxy Example](./images/webscoket.png)

### Tree View Structure

![Tree View Structure Example](./images/tree.png)

## Installation

Quickly install Lynx Proxy with the one-click installation script:

```bash
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/suxin2017/lynx-server/releases/latest/download/lynx-cli-installer.sh | sh
```

## Quick Start

```bash
# Start the service
lynx-cli
```

```
A proxy service

Usage: lynx-cli [OPTIONS]

Options:
  -p, --port <PORT>            proxy server port [default: 3000]
      --log-level <LOG_LEVEL>  log level [default: silent] [possible values: silent, info, error, debug, trace]
      --data-dir <DATA_DIR>    data dir if not set, use default data dir
  -h, --help                   Print help
  -V, --version                Print version
```

## Contribution Guide

Community contributions are welcome! Please follow these steps to participate in development:

1. Fork this repository
2. Create a new branch: `git checkout -b feature-branch`
3. Install dependencies
   - Install [taskfile](https://taskfile.dev/)
   - Install UI dependencies
     ```bash
     task setup-ui
     ```
   - Start the development environment
     ```bash
     task dev
     ```
4. Commit your changes: `git commit -am 'Add new feature'`
5. Push your branch: `git push origin feature-branch`
6. Create a Pull Request

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

If you have any questions or suggestions, please submit feedback via GitHub Issues.

## Project Status

The project is under active development. Stay tuned and feel free to participate!

## Roadmap

https://v0-modern-proxy-tool-wq.vercel.app/


