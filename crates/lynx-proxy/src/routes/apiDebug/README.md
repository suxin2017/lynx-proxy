# API Debug 功能说明

## 概述

API Debug 是一个类似 Postman 的 API 测试工具，用于调试和测试 HTTP 请求。

## 功能特性

### 请求构建器 (RequestBuilder)

- 支持所有常用 HTTP 方法 (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)
- URL 输入框
- 发送按钮，带加载状态
- 方法选择器使用彩色标签

### Headers 编辑器 (HeadersEditor)

- 动态添加/删除 HTTP 头
- 每个 header 都可以单独启用/禁用
- 快速添加常用 headers 的下拉菜单
- 显示已启用 headers 的数量

### Body 编辑器 (BodyEditor)

- 支持多种 Content-Type
- JSON 自动格式化功能
- 清空内容按钮
- 等宽字体显示，便于阅读

### 响应查看器 (ResponseViewer)

- 显示响应状态码和状态文本
- 响应时间和内容大小统计
- Headers 详细显示
- 响应体自动格式化 (JSON)
- 错误状态显示

### 设置编辑器 (SettingsEditor)

- 配置请求超时时间

## 技术特点

- **TypeScript 类型安全**：完整的类型定义
- **组件化设计**：每个功能模块独立组件
- **Ant Design 界面**：现代化的 UI 设计
- **响应式布局**：左右分栏设计，类似 Postman
- **实时验证**：输入验证和错误提示

## 使用方式

1. 选择 HTTP 方法
2. 输入请求 URL
3. 配置 Headers（可选）
4. 设置请求 Body（可选）
5. 调整设置（可选）
6. 点击 Send 发送请求
7. 查看右侧响应结果

## API 集成

使用 `/api_debug_executor/execute` 接口发送请求，支持：

- 所有 HTTP 方法
- 自定义 Headers
- 请求 Body
- 超时设置
- 错误处理
