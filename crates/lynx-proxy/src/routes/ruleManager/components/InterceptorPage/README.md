# 规则导入导出功能测试

## 测试数据示例

以下是一个测试用的规则导出文件示例：

```json
{
  "version": "1.0.0",
  "exportTime": "2025-01-11T10:00:00.000Z",
  "rules": [
    {
      "name": "测试规则1",
      "description": "这是一个测试规则",
      "enabled": true,
      "priority": 50,
      "capture": {
        "condition": {
          "type": "simple",
          "urlPattern": {
            "pattern": "https://example.com/*",
            "captureType": "glob"
          }
        }
      },
      "handlers": [
        {
          "name": "阻止请求",
          "description": "阻止访问示例网站",
          "enabled": true,
          "executionOrder": 0,
          "handlerType": {
            "type": "block",
            "statusCode": 403,
            "reason": "Access blocked by test rule"
          }
        }
      ]
    },
    {
      "name": "测试规则2",
      "description": "延迟处理规则",
      "enabled": true,
      "priority": 30,
      "capture": {
        "condition": {
          "type": "simple",
          "urlPattern": {
            "pattern": "https://api.example.com/*",
            "captureType": "glob"
          }
        }
      },
      "handlers": [
        {
          "name": "添加延迟",
          "description": "为API请求添加延迟",
          "enabled": true,
          "executionOrder": 0,
          "handlerType": {
            "type": "delay",
            "delayMs": 1000,
            "varianceMs": 200,
            "delayType": "beforeRequest"
          }
        }
      ]
    }
  ]
}
```

## 功能说明

### 导出功能
- 支持导出所有规则或选中的规则
- 支持JSON和备份格式
- 自动移除ID字段，确保导入时不冲突
- 包含版本信息和导出时间

### 导入功能
- 支持.json和.backup格式文件
- 自动验证文件格式和规则数据
- 支持选择性导入规则
- 提供详细的导入结果反馈
- 包含数据清理和验证逻辑

### 数据验证
- 规则名称：必填，默认为"Imported Rule"
- 描述：可选，空值处理
- 启用状态：默认为true
- 优先级：限制在0-100之间
- 捕获条件：提供默认值
- 处理器：确保数组格式和默认值

### 错误处理
- 文件格式验证
- 规则数据验证
- 批量导入时的部分成功/失败处理
- 详细的错误日志和用户提示

## 使用方法

1. **导出规则**：
   - 点击"导出规则"按钮
   - 选择导出类型（所有或选中）
   - 选择导出格式
   - 确认导出，文件将自动下载

2. **导入规则**：
   - 点击"导入规则"按钮
   - 拖拽或选择规则文件
   - 查看文件信息和规则列表
   - 选择要导入的规则
   - 确认导入，查看导入结果

## 故障排查

### 常见问题修复

1. **导入时500错误**：
   - ✅ 已修复：自动移除capture中的id字段
   - ✅ 已修复：处理null值字段
   - ✅ 已修复：添加数据验证和清理逻辑
   - ✅ 已修复：确保所有必填字段都有默认值

2. **数据格式问题**：
   - ✅ 已修复：统一数据格式
   - ✅ 已修复：类型安全的数据处理
   - ✅ 已修复：导出时移除不必要的字段

### 如果导入时出现问题，请检查：

1. **检查文件格式**：确保JSON格式正确
2. **检查数据结构**：确认规则数据的完整性
3. **查看控制台日志**：获取详细的错误信息
4. **检查服务器日志**：如果问题持续存在

### 已知修复的问题：

- ✅ capture对象中的id字段导致500错误
- ✅ null值字段处理
- ✅ 缺失必填字段的默认值处理
- ✅ 类型不匹配的数据转换
- ✅ 导出数据格式优化

## 测试数据

项目中包含了两个测试文件：
- `test-import-rule.json` - 基本测试数据
- `test-import-rules-complete.json` - 完整测试数据

您可以使用这些文件来测试导入功能是否正常工作。
