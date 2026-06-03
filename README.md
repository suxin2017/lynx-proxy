# Lynx Proxy

English | [简体中文](README.zh-CN.md)

[![Crates.io License](https://img.shields.io/crates/l/lynx-core)](./LICENSE)
[![Crates](https://img.shields.io/crates/v/lynx-core.svg)](https://crates.io/crates/lynx-core)

**Lynx Proxy** is a Rust-based HTTP(S) / WebSocket proxy and traffic inspector for local development. Built on hyper, axum, and tower, it helps you inspect APIs, rewrite traffic with rules, inject scripts, and point static assets to local services — without installing a separate runtime.

## Why Lynx

- **Single binary** — install with one script; the Web UI ships inside the CLI.
- **Local-first** — bind to loopback by default; your traffic stays on your machine.
- **Developer-oriented** — list & tree views, DSL filters, rules, and a built-in Compose panel.

## Features

### Protocols & client

- HTTP(S) and WebSocket(S) interception
- Embedded Web UI (Vue 3 + Vite), light/dark theme, PWA-friendly
- Real-time request stream over WebSocket

### Network panel

- **Table view** — sortable virtualized list with request/response detail
- **Tree view** — group by host and path
- **DSL filter** — filter captured traffic with match expressions
- **Focus / Ignore** — quick capture filters from the toolbar or context menu

### Rules

Match traffic with simple patterns (glob, regex, host, path, method) or compound DSL (`AND`, `OR`, `NOR`), then apply actions:

| Action | Description |
|--------|-------------|
| Modify request / response | Headers, body, method, URL, status |
| Block | Return a custom status |
| Delay | Simulate slow upstream |
| Throttle | Network presets (3G, offline, custom) |
| Proxy forward | Rewrite upstream target |
| Local file | Serve a local file instead |
| HTML script injector | Inject scripts into HTML responses |

Right-click any request to add Focus/Ignore rules or copy as cURL.

### Compose (API debug)

Send HTTP requests from the UI, edit params/headers/body, and inspect responses — similar to Postman, integrated with the same proxy session.

### CLI

- `start` / `stop` / `restart` — background daemon
- `run` — foreground server (default port **7788**)
- `status` — process, port, and data directory

Cross-platform: **Windows**, **macOS**, **Linux**.

## Screenshots

### HTTP / HTTPS

![HTTP proxy — table view with request detail](./images/newhttp.png)

### WebSocket

![WebSocket frames in request detail](./images/newws.png)

### Tree view

![Tree view grouped by host and path](./images/newtree.png)

### Rules

![Rule list and editor](./images/rule.png)

### Context menu

![Quick actions from the traffic list](./images/contextmenu.png)

![Copy and Focus submenus](./images/contextmenu2.png)

### Compose

![Compose — send and debug requests](./images/api_debug.png)

### CLI status

```bash
$ lynx status
=== Lynx Proxy Service Status ===
PID: 101744
Port: 7788
Status: Running
Data Directory: ~/.local/share/lynx
Start Time: 1749816127 seconds since epoch
Process Running: Yes
```

## Usage

### Install

Prebuilt releases are published on [GitHub Releases](https://github.com/suxin2017/lynx-proxy/releases). The install scripts are named **`lynx-cli-installer.*`** (cargo-dist package name), but they install the **`lynx`** command.

> **Note (v0.4.8 and earlier):** installers built before the repo rename still download binaries from `suxin2017/lynx-server` internally. The script URL can use either `lynx-proxy` or `lynx-server` — both hosts mirror the same release assets today. Future releases (after updating `repository` in `Cargo.toml`) will point entirely at `lynx-proxy`.

**macOS / Linux (recommended)**

```bash
curl --proto '=https' --tlsv1.2 -LsSf \
  https://github.com/suxin2017/lynx-proxy/releases/latest/download/lynx-cli-installer.sh | sh
```

**Windows (PowerShell)**

```powershell
powershell -ExecutionPolicy Bypass -c "irm https://github.com/suxin2017/lynx-proxy/releases/latest/download/lynx-cli-installer.ps1 | iex"
```

After install:

- Binary: **`lynx`** (not `lynx-cli`)
- Default location: `~/.cargo/bin/lynx` — add it to your `PATH` if the installer did not
- Verify: `lynx --version`

**Manual download** (from [Releases](https://github.com/suxin2017/lynx-proxy/releases)):

| Platform | Archive |
|----------|---------|
| macOS (Intel) | `lynx-cli-x86_64-apple-darwin.tar.xz` |
| macOS (Apple Silicon) | `lynx-cli-aarch64-apple-darwin.tar.xz` |
| Linux (x64) | `lynx-cli-x86_64-unknown-linux-gnu.tar.xz` |
| Windows (x64) | `lynx-cli-x86_64-pc-windows-msvc.zip` |

ARM Linux is not in the release matrix yet — build from source (see Development).

**Build from source**

```bash
git clone https://github.com/suxin2017/lynx-proxy.git
cd lynx-proxy
task build-ui && cargo install --path crates/lynx-cli
```

### Quick start

1. Start the proxy:

   ```bash
   lynx run
   ```

2. Point your browser or app at `http://127.0.0.1:7788` (or configure the system HTTP proxy).

3. Open the Web UI at **http://127.0.0.1:7788** and enable capture.

4. Install the Lynx CA certificate from **Settings** when you need HTTPS decryption.

### Common commands

```bash
lynx run          # foreground, default port 7788
lynx start        # background daemon
lynx stop
lynx restart
lynx status
```

### Options (`run` / `start`)

| Option | Default | Description |
|--------|---------|-------------|
| `--port` | `7788` | Proxy listen port |
| `--data-dir` | OS-specific | Rules and persistent data |
| `--log-level` | `info` | `silent`, `info`, `error`, `debug`, `trace` |
| `--connect-type` | `sse` | `sse` or `short-poll` |
| `--local-only` | off | Bind to loopback only |

Default data directories:

- Linux: `~/.local/share/lynx`
- macOS: `~/Library/Application Support/lynx`
- Windows: `%APPDATA%\suxin2017\lynx\data`

## Development

Requires [Rust](https://rustup.rs/), [Node.js](https://nodejs.org/) 20+, and [Task](https://taskfile.dev/).

```bash
task setup-ui    # npm ci in ui/
task dev         # proxy :7788 + Vite UI :5173
```

Other useful tasks:

| Task | Purpose |
|------|---------|
| `task build-ui` | Production UI build → embedded in CLI |
| `task traffic-sample` | Send sample HTTP(S) through the proxy |
| `task readme-demo` | Seed demo traffic & rules for docs |
| `task readme-screenshots` | Regenerate `images/*.png` (uses system Chrome) |

See [ui/README.md](ui/README.md) for UI architecture and screenshot workflow.

### Contributing

1. Fork the repo and create a branch.
2. `task setup-ui && task dev`
3. Make changes; run `task test` and `task lint` when touching Rust.
4. Open a Pull Request.

## License

MIT — see [LICENSE](LICENSE).

## Feedback

Questions and ideas: [GitHub Issues](https://github.com/suxin2017/lynx-proxy/issues).

## Status

Usable for daily development; features and UI are still evolving — contributions welcome.
