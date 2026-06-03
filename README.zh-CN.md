# Lynx Proxy

[English](README.md) | 简体中文

[![Crates.io License](https://img.shields.io/crates/l/lynx-core)](./LICENSE)
[![Crates](https://img.shields.io/crates/v/lynx-core.svg)](https://crates.io/crates/lynx-core)

**Lynx Proxy** 是一款基于 Rust 的 HTTP(S) / WebSocket 本地代理与抓包工具，采用 hyper、axum、tower 等主流网络库。适用于移动端联调查看接口、Web 开发时将静态资源指向本地、脚本注入、按规则改写/拦截流量等场景 —— 安装为单一可执行文件，无需额外运行时。

## 为什么选择 Lynx

- **开箱即用**：一行脚本安装，Web 界面内嵌在 CLI 中。
- **本地优先**：默认仅监听本机，流量留在你的机器上。
- **面向开发**：列表/树形视图、DSL 过滤、规则引擎、内置 Compose 发请求。

## 功能特性

### 协议与客户端

- 支持 HTTP(S)、WebSocket(S) 抓包与展示
- 现代 Web 客户端（Vue 3 + Vite），亮色/暗色主题，支持 PWA
- 通过 WebSocket 实时推送请求流

### 请求面板

- **列表视图**：虚拟滚动表格，下方展示请求/响应详情
- **树形视图**：按 Host、路径分组浏览
- **DSL 过滤**：用匹配表达式筛选已捕获流量
- **Focus / Ignore**：工具栏或右键菜单快速添加捕获范围

### 规则捕获与处理

支持简单匹配（Glob、正则、Host、路径、Method）与组合 DSL（`AND`、`OR`、`NOR`），命中后可执行：

| 动作 | 说明 |
|------|------|
| 修改请求 / 响应 | Header、Body、Method、URL、状态码 |
| 拦截 | 返回指定状态码 |
| 延迟 | 模拟慢速上游 |
| 限速 | 3G / 离线等网络预设或自定义 |
| 代理转发 | 改写上游目标 |
| 本地文件 | 用本地文件响应 |
| HTML 脚本注入 | 向 HTML 响应注入脚本 |

在请求列表 **右键** 可快速添加 Focus/Ignore、复制 cURL 等。

### Compose（API 调试）

在界面内直接构造并发送 HTTP 请求，编辑 Query / Header / Body，查看响应 —— 类似 Postman，与当前代理会话一体。

### 命令行

- `start` / `stop` / `restart` — 后台守护进程
- `run` — 前台启动（默认端口 **7788**）
- `status` — 查看进程、端口、数据目录

跨平台：**Windows**、**macOS**、**Linux**。

## 功能展示

### HTTP / HTTPS 代理

![HTTP 代理 — 列表视图与请求详情](./images/newhttp.png)

### WebSocket 代理

![WebSocket 帧详情](./images/newws.png)

### 树形结构视图

![按 Host / 路径分组的树形视图](./images/newtree.png)

### 规则配置

![规则列表与编辑器](./images/rule.png)

### 一键添加规则

![请求列表右键菜单](./images/contextmenu.png)

![复制与 Focus 子菜单](./images/contextmenu2.png)

### 发送请求（Compose）

![Compose — 构造并调试请求](./images/api_debug.png)

### CLI 查询状态

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

## 使用

### 安装

预编译包发布在 [GitHub Releases](https://github.com/suxin2017/lynx-proxy/releases)。安装脚本文件名为 **`lynx-cli-installer.*`**（cargo-dist 包名），安装后的命令是 **`lynx`**。

> **说明（v0.4.8 及更早版本）：** 仓库改名前的安装脚本，会从 `suxin2017/lynx-server` 下载二进制；脚本本身的 URL 用 `lynx-proxy` 或 `lynx-server` 均可，两个仓库目前镜像同一份 Release 资源。后续发版（已修正 `Cargo.toml` 中的 `repository`）将统一指向 `lynx-proxy`。

**macOS / Linux（推荐）**

```bash
curl --proto '=https' --tlsv1.2 -LsSf \
  https://github.com/suxin2017/lynx-proxy/releases/latest/download/lynx-cli-installer.sh | sh
```

**Windows（PowerShell）**

```powershell
powershell -ExecutionPolicy Bypass -c "irm https://github.com/suxin2017/lynx-proxy/releases/latest/download/lynx-cli-installer.ps1 | iex"
```

安装完成后：

- 命令名：**`lynx`**（不是 `lynx-cli`）
- 默认路径：`~/.cargo/bin/lynx`，若终端找不到命令请将其加入 `PATH`
- 验证：`lynx --version`

**手动下载**（见 [Releases](https://github.com/suxin2017/lynx-proxy/releases)）：

| 平台 | 压缩包 |
|------|--------|
| macOS（Intel） | `lynx-cli-x86_64-apple-darwin.tar.xz` |
| macOS（Apple Silicon） | `lynx-cli-aarch64-apple-darwin.tar.xz` |
| Linux（x64） | `lynx-cli-x86_64-unknown-linux-gnu.tar.xz` |
| Windows（x64） | `lynx-cli-x86_64-pc-windows-msvc.zip` |

ARM Linux 暂无官方预编译包 — 请从源码构建（见「开发」）。

**从源码构建**

```bash
git clone https://github.com/suxin2017/lynx-proxy.git
cd lynx-proxy
task build-ui && cargo install --path crates/lynx-cli
```

### 快速开始

1. 启动代理：

   ```bash
   lynx run
   ```

2. 将浏览器或应用的 HTTP 代理指向 `127.0.0.1:7788`（或按系统代理设置）。

3. 浏览器打开 **http://127.0.0.1:7788**，进入 Web 界面并开启录制。

4. 需要解密 HTTPS 时，在 **设置** 中安装 Lynx 根证书。

### 常用命令

```bash
lynx run          # 前台运行，默认 7788
lynx start        # 后台守护进程
lynx stop
lynx restart
lynx status
```

### 参数说明（`run` / `start`）

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--port` | `7788` | 代理监听端口 |
| `--data-dir` | 随系统 | 规则与持久化数据目录 |
| `--log-level` | `info` | `silent`、`info`、`error`、`debug`、`trace` |
| `--connect-type` | `sse` | `sse` 或 `short-poll` |
| `--local-only` | 关闭 | 仅绑定本机回环地址 |

默认数据目录：

- Linux：`~/.local/share/lynx`
- macOS：`~/Library/Application Support/lynx`
- Windows：`%APPDATA%\suxin2017\lynx\data`

## 开发

需要 [Rust](https://rustup.rs/)、[Node.js](https://nodejs.org/) 20+、[Task](https://taskfile.dev/)。

```bash
task setup-ui    # 安装 ui 依赖
task dev         # 代理 :7788 + Vite 开发界面 :5173
```

其他常用任务：

| 任务 | 用途 |
|------|------|
| `task build-ui` | 构建生产 UI 并嵌入 CLI |
| `task traffic-sample` | 经代理发送示例 HTTP(S) 流量 |
| `task readme-demo` | 写入文档用演示流量与规则 |
| `task readme-screenshots` | 重新生成 `images/*.png`（使用系统 Chrome） |

UI 架构与截图流程见 [ui/README.md](ui/README.md)。

### 贡献指南

1. Fork 仓库并创建分支。
2. 执行 `task setup-ui && task dev` 启动开发环境。
3. 修改代码；涉及 Rust 时可运行 `task test`、`task lint`。
4. 提交 Pull Request。

## 许可证

MIT，详见 [LICENSE](LICENSE)。

## 反馈

问题与建议请通过 [GitHub Issues](https://github.com/suxin2017/lynx-proxy/issues) 提交。

## 项目状态

已可用于日常开发，功能与界面仍在持续迭代，欢迎 Star 与贡献。
