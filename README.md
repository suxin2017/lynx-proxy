# Lynx Proxy

[English](README.md) | 简体中文

[![Crates.io License](https://img.shields.io/crates/l/lynx-core)](./LICENSE)
[![Crates](https://img.shields.io/crates/v/lynx-core.svg)](https://crates.io/crates/lynx-core)

**Lynx Proxy** 是一款基于 Rust 语言开发的代理抓包工具，项目采用 hyper、axum、tower 等主流 Rust 网络库，以满足不同在开发阶段的需求，比如移动端开发时候查看接口，脚本注入，web 端开发时候将静态资源指向本地服务

## 功能特性

- **常见协议支持**：支持 HTTP(S) 与 WS(S)
- **Web 客户端**：使用流行的现代 web 技术，支持亮色与暗色两种主题,支持PWA
- **Rust 生态**：基于 hyper、axum、tower 等主流库开发。
- **请求面板**：
  - 列表视图
  - 树形视图
- **规则捕获与处理**
  - 通过添加规则进行请求捕获，同时进行请求处理
  - 规则
    - 简单规则 （Glob 匹配，正则匹配，HostName，精确匹配）
    - 复杂规则 （AND、OR、NOR）
  - 处理
    - 请求修改
    - 请求延迟
    - 请求拦截
    - 脚本注入
- **请求调试**
  - 支持发送请求
  - 历史记录
  - 请求目录
- **安装与升级脚本支持**
  - 安装只需要一行脚本，不需要安装任何运行时
- **跨平台支持**
  - 支持 Window、Macos、Linux 平台

## 功能展示

### HTTP/HTTPS 代理

![HTTP 代理示例](./images/newhttp.png)

### WebSocket 代理

![WebSocket 代理示例](./images/newws.png)

### 树形结构视图

![树形结构视图示例](./images/newtree.png)

### 规则配置

![规则配置](./images/rule.png)

### 发送请求

![api debug](./images/api_debug.png)

### Cli 查询状态

```bash
PS C:\Users\xx> lynx-cli status
=== Lynx Proxy Service Status ===
PID: 101744
Port: 7788
Status: Running
Data Directory: Your Data Dir
Start Time: 1749816127 seconds since epoch
Process Running: Yes
```


## 使用

### 安装

#### Bash
```bash
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/suxin2017/lynx-proxy/releases/latest/download/lynx-cli-installer.sh | sh
```

#### Powershell 

```powershell
powershell -ExecutionPolicy Bypass -c "irm https://github.com/suxin2017/lynx-proxy/releases/latest/download/lynx-cli-installer.ps1 | iex"
```

### 快速开始

```bash
lynx-cli run
```

### 命令行参数

```
Lynx Proxy Server

Usage: lynx-cli <COMMAND>

Commands:
  start    Start the background proxy service
  stop     Stop the background proxy service
  restart  Restart the background proxy service
  status   Show background proxy service status
  run      Start the proxy server in foreground mode
  help     Print this message or the help of the given subcommand(s)

Options:
  -h, --help     Print help
  -V, --version  Print version
```

### Start
```
通过守护进程启动后台服务

Usage: lynx-cli start [OPTIONS]

Options:
  -p, --port <PORT>                  proxy server port [default: 7788]
      --data-dir <DATA_DIR>          data dir The default data directory path following OS conventions: - Linux: ~/.local/share/lynx - macOS: ~/Library/Application Support/lynx - Windows: %APPDATA%\suxin2017\lynx\data
      --log-level <LOG_LEVEL>        Log level for the proxy server [default: info] [possible values: silent, info, error, debug, trace]
      --connect-type <CONNECT_TYPE>  [default: sse] [possible values: short-poll, sse]
      --local-only                   Enable local only mode (only bind to loopback addresses)
  -h, --help                         Print help (see more with '--help')
```

### Run
```
直接启动服务

Usage: lynx-cli run [OPTIONS]

Options:
  -p, --port <PORT>                  proxy server port [default: 7788]
      --data-dir <DATA_DIR>          data dir The default data directory path following OS conventions: - Linux: ~/.local/share/lynx - macOS: ~/Library/Application Support/lynx - Windows: %APPDATA%\suxin2017\lynx\data
      --log-level <LOG_LEVEL>        Log level for the proxy server [default: info] [possible values: silent, info, error, debug, trace]
      --connect-type <CONNECT_TYPE>  [default: sse] [possible values: short-poll, sse]
      --local-only                   Enable local only mode (only bind to loopback addresses)
  -h, --help                         Print help (see more with '--help')
```
## 贡献指南

欢迎社区贡献！请按照以下流程参与开发：

1. Fork 本仓库
2. 创建新分支：`git checkout -b feature-branch`
3. 安装依赖
   - 安装 [taskfile](https://taskfile.dev/)
   - 安装 UI 相关依赖
     ```bash
     task setup-ui
     ```
   - 启动开发环境
     ```bash
     task dev
     ```
4. 提交更改：`git commit -am 'Add new feature'`
5. 推送分支：`git push origin feature-branch`
6. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证，详情请参阅 [LICENSE](LICENSE) 文件。

## 联系我们

如有任何问题或建议，请通过 GitHub Issues 提交反馈。

## 项目状态

项目已经可以使用，功能迭代仍在积极开发中，欢迎关注和参与！

