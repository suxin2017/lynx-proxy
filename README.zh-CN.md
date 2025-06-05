# Lynx Proxy

[English](README.md) | 简体中文

[![Crates.io License](https://img.shields.io/crates/l/lynx-core)](./LICENSE)
[![Crates](https://img.shields.io/crates/v/lynx-core.svg)](https://crates.io/crates/lynx-core)

**Lynx Proxy** 是一款基于 Rust 语言开发的代理抓包工具项目采用，hyper、axum、tower 等主流 Rust 网络库，以满足不同在开发阶段的需求，比如移动端开发时候查看接口，脚本注入，web 端开发时候将静态资源指向本地服务

## 功能特性

- **常见协议支持**：支持 HTTP(S) 与 WS(S)
- **Web 客户端**：使用流行的现代 web 技术，支持亮色与暗色两种主题
- **Rust 生态**：基于 hyper、axum、tower 等主流库开发。
- **请求面板**：
  - 列表视图
    ![HTTP 代理示例](./images/http.png)
  - 树形视图
    ![树形结构视图示例](./images/tree.png)
- **规则捕获与处理**
  - 通过添加规则进行请求捕获，同时进行请求处理
  - 规则
    - 简单规则 （Glob 匹配，正则匹配，HostName，精确匹配）
    - 复杂规则 （AND、OR、NOR）
- **安装与升级脚本支持**
  - 安装只需要一行脚本，不需要安装任何运行时
- **跨平台支持**
  - 支持 Window、Macos、Linux 平台

## 功能展示

### HTTP/HTTPS 代理

![HTTP 代理示例](./images/http.png)

### WebSocket 代理

![WebSocket 代理示例](./images/webscoket.png)

### 树形结构视图

![树形结构视图示例](./images/tree.png)

### 规则配置

![规则配置](./images/rule.png)

## 使用

通过一键安装脚本快速安装 Lynx Proxy：

```bash
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/suxin2017/lynx-server/releases/latest/download/lynx-cli-installer.sh | sh
```

```bash
# 启动服务
lynx-cli
```

### 命令行参数

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

项目仍在持续开发中，欢迎关注和参与！

## 未来规划

https://v0-modern-proxy-tool-wq.vercel.app/
