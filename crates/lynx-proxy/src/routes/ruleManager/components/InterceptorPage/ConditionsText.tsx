import React from 'react';
import { Typography, Tag, Space } from 'antd';
import {
  CaptureRule,
  CaptureCondition,
  SimpleCaptureCondition,
  ComplexCaptureRule,
  CaptureType,
  LogicalOperator,
} from '@/services/generated/utoipaAxum.schemas';

const { Text } = Typography;

interface ConditionsTextProps {
  capture: CaptureRule;
  className?: string;
  style?: React.CSSProperties;
}

const getCaptureTypeLabel = (type: CaptureType): string => {
  const typeMap = {
    [CaptureType.glob]: 'Glob',
    [CaptureType.regex]: '正则',
    [CaptureType.exact]: '精确',
    [CaptureType.contains]: '包含',
  };
  return typeMap[type] || type;
};

const getOperatorLabel = (operator: LogicalOperator): string => {
  const operatorMap = {
    [LogicalOperator.and]: 'AND',
    [LogicalOperator.or]: 'OR',
    [LogicalOperator.not]: 'NOT',
  };
  return operatorMap[operator] || operator;
};

const renderSimpleCondition = (condition: SimpleCaptureCondition): React.ReactNode => {
  const parts: React.ReactNode[] = [];

  // 添加匹配类型标签
  if (condition.urlPattern) {
    parts.push(
      <Tag key="type" color="blue" style={{ fontSize: '12px' }}>
        {getCaptureTypeLabel(condition.urlPattern.captureType)}
      </Tag>
    );

    // 添加模式
    if (condition.urlPattern.pattern) {
      parts.push(
        <Text key="pattern" code style={{ fontSize: '12px' }}>
          {condition.urlPattern.pattern}
        </Text>
      );
    }
  }

  // 添加方法过滤
  if (condition.method) {
    parts.push(
      <span key="method">
        <Text type="secondary">方法: </Text>
        <Tag color="green" style={{ fontSize: '12px' }}>{condition.method}</Tag>
      </span>
    );
  }

  // 添加主机过滤
  if (condition.host) {
    parts.push(
      <span key="host">
        <Text type="secondary">主机: </Text>
        <Tag color="orange" style={{ fontSize: '12px' }}>{condition.host}</Tag>
      </span>
    );
  }

  return (
    <Space size="small" wrap>
      {parts}
    </Space>
  );
};

const renderCondition = (condition: CaptureCondition, depth = 0): React.ReactNode => {
  // 检查是否为简单条件
  if ('urlPattern' in condition && !('operator' in condition)) {
    return renderSimpleCondition(condition as SimpleCaptureCondition);
  }

  // 处理复杂条件
  const complexCondition = condition as ComplexCaptureRule;
  if (!complexCondition.operator || !complexCondition.conditions) {
    return <Text type="secondary">-</Text>;
  }

  const operatorLabel = getOperatorLabel(complexCondition.operator);
  const isNested = depth > 0;

  return (
    <div style={{ marginLeft: isNested ? 16 : 0 }}>
      <Space direction="vertical" size="small">
        <div>
          <Tag color="purple" style={{ fontSize: '12px' }}>
            {operatorLabel}
          </Tag>
          {complexCondition.operator === LogicalOperator.not && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              (非)
            </Text>
          )}
        </div>
        <div style={{ paddingLeft: 8, borderLeft: isNested ? '2px solid #f0f0f0' : 'none' }}>
          {complexCondition.conditions.map((subCondition, index) => (
            <div key={index} style={{ marginBottom: index < complexCondition.conditions.length - 1 ? 8 : 0 }}>
              {renderCondition(subCondition, depth + 1)}
            </div>
          ))}
        </div>
      </Space>
    </div>
  );
};

export const ConditionsText: React.FC<ConditionsTextProps> = ({
  capture,
  className,
  style,
}) => {
  if (!capture?.condition) {
    return (
      <Text type="secondary" className={className} style={style}>
        -
      </Text>
    );
  }

  return (
    <div className={className} style={style}>
      {renderCondition(capture.condition)}
    </div>
  );
};
