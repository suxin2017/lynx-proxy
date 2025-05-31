import React from 'react';
import { Tag, Typography } from 'antd';
import { HandlerRule, HandlerRuleType } from '@/services/generated/utoipaAxum.schemas';

const { Text } = Typography;

interface ActionCellProps {
  handlers: HandlerRule[];
}

// Handler类型对应的标签颜色和显示文本
const getHandlerRuleTypeConfig = (type?: HandlerRuleType) => {
  switch (type?.type) {
    case "block":
      return { color: 'red', text: '阻止' };
    case "modifyRequest":
      return { color: 'blue', text: '修改请求' };
    case "modifyResponse":
      return { color: 'green', text: '修改响应' };
    case "localFile":
      return { color: 'orange', text: '本地文件' };
    case "proxyForward":
      return { color: 'purple', text: '代理转发' };
    default:
      return { color: 'default', text: '未知动作' };
  }
};

// 安全地获取config中的值
const getConfigValue = (config: any, key: string, defaultValue?: any) => {
  if (config && typeof config === 'object' && key in config) {
    return config[key];
  }
  return defaultValue;
};

// 获取handler的描述文本
const getHandlerDescription = (handler: HandlerRule): string => {
  const { handlerType, } = handler;

  switch (handlerType.type) {
    case "block":
      const statusCode = getConfigValue(handler, 'statusCode', 403);
      const reason = getConfigValue(handler, 'reason', '访问被阻止');
      return `状态码: ${statusCode} - ${reason}`;

    case "modifyRequest":
      const parts = [];
      if (getConfigValue(handler, 'modifyHeaders')) {
        parts.push('修改请求头');
      }
      if (getConfigValue(handler, 'modifyBody')) {
        parts.push('修改请求体');
      }
      const modifyMethod = getConfigValue(handler, 'modifyMethod');
      if (modifyMethod) {
        parts.push(`方法: ${modifyMethod}`);
      }
      if (getConfigValue(handler, 'modifyUrl')) {
        parts.push('修改URL');
      }
      return parts.length > 0 ? parts.join(', ') : '修改请求';

    case "modifyResponse":
      const responseParts = [];
      const responseStatusCode = getConfigValue(handler, 'statusCode');
      if (responseStatusCode) {
        responseParts.push(`状态码: ${responseStatusCode}`);
      }
      if (getConfigValue(handler, 'headers')) {
        responseParts.push('修改响应头');
      }
      if (getConfigValue(handler, 'body')) {
        responseParts.push('修改响应体');
      }
      return responseParts.length > 0 ? responseParts.join(', ') : '修改响应';

    case "localFile":
      const filePath = getConfigValue(handler, 'filePath');
      return filePath ? `文件: ${filePath}` : '返回本地文件';

    case "proxyForward":
      const targetHost = getConfigValue(handler, 'targetHost');
      return targetHost ? `转发到: ${targetHost}` : '代理转发';

    default:
      return handler.description || '未知动作';
  }
};

export const ActionCell: React.FC<ActionCellProps> = ({ handlers }) => {
  if (!handlers || handlers.length === 0) {
    return (
      <div>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          无动作
        </Text>
      </div>
    );
  }

  // 只显示启用的handlers
  const enabledHandlers = handlers.filter(handler => handler.enabled);

  if (enabledHandlers.length === 0) {
    return (
      <div>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          所有动作已禁用
        </Text>
      </div>
    );
  }

  // 按执行顺序排序
  const sortedHandlers = [...enabledHandlers].sort((a, b) => a.executionOrder - b.executionOrder);

  return (
    <div>
      {sortedHandlers.map((handler, index) => {
        const config = getHandlerRuleTypeConfig(handler?.handlerType);
        return (
          <div key={handler.id || index} style={{ marginBottom: index < sortedHandlers.length - 1 ? 4 : 0 }}>
            <Tag color={config.color}>
              {config.text}
            </Tag>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {getHandlerDescription(handler)}
            </Text>
          </div>
        );
      })}
    </div>
  );
};
