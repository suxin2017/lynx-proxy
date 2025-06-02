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
import { useI18n } from '@/contexts';

const { Text } = Typography;

interface ConditionsTextProps {
  capture: CaptureRule;
  className?: string;
  style?: React.CSSProperties;
}

const useCaptureTypeLabel = () => {
  const { t } = useI18n();

  return (type: CaptureType): string => {
    const typeMap = {
      [CaptureType.glob]: t('ruleManager.captureTypes.glob'),
      [CaptureType.regex]: t('ruleManager.captureTypes.regex'),
      [CaptureType.exact]: t('ruleManager.captureTypes.exact'),
      [CaptureType.contains]: t('ruleManager.captureTypes.contains'),
    };
    return typeMap[type] || type;
  };
};

const useOperatorLabel = () => {
  const { t } = useI18n();

  return (operator: LogicalOperator): string => {
    const operatorMap = {
      [LogicalOperator.and]: t('ruleManager.operators.and'),
      [LogicalOperator.or]: t('ruleManager.operators.or'),
      [LogicalOperator.not]: t('ruleManager.operators.not'),
    };
    return operatorMap[operator] || operator;
  };
};

const RenderSimpleCondition: React.FC<{
  condition: SimpleCaptureCondition;
}> = ({ condition }): React.ReactNode => {
  const { t } = useI18n();
  const parts: React.ReactNode[] = [];
  const captureTypeLabel = useCaptureTypeLabel();
  if (condition.urlPattern) {
    parts.push(
      <Tag key="type" color="blue" style={{ fontSize: '12px' }}>
        {captureTypeLabel(condition.urlPattern.captureType)}
      </Tag>,
    );

    if (condition.urlPattern.pattern) {
      parts.push(
        <Text key="pattern" code style={{ fontSize: '12px' }}>
          {condition.urlPattern.pattern}
        </Text>,
      );
    }
  }

  if (condition.method) {
    parts.push(
      <span key="method">
        <Text type="secondary">{t('ruleManager.conditionLabels.method')}</Text>
        <Tag color="green" style={{ fontSize: '12px' }}>
          {condition.method}
        </Tag>
      </span>,
    );
  }

  if (condition.host) {
    parts.push(
      <span key="host">
        <Text type="secondary">{t('ruleManager.conditionLabels.host')}</Text>
        <Tag color="orange" style={{ fontSize: '12px' }}>
          {condition.host}
        </Tag>
      </span>,
    );
  }

  return (
    <Space size="small" wrap>
      {parts}
    </Space>
  );
};

const RenderCondition: React.FC<{
  condition: CaptureCondition;
  depth?: number;
}> = (
  { condition, depth = 0 }, // 默认深度为0
): React.ReactNode => {
  const getOperatorLabel = useOperatorLabel();
  const { t } = useI18n();

  // 检查是否为简单条件
  if ('urlPattern' in condition && !('operator' in condition)) {
    return (
      <RenderSimpleCondition condition={condition as SimpleCaptureCondition} />
    );
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
              {t('ruleManager.conditionLabels.not')}
            </Text>
          )}
        </div>
        <div
          style={{
            paddingLeft: 8,
            borderLeft: isNested ? '2px solid #f0f0f0' : 'none',
          }}
        >
          {complexCondition.conditions.map((subCondition, index) => (
            <div
              key={index}
              style={{
                marginBottom:
                  index < complexCondition.conditions.length - 1 ? 8 : 0,
              }}
            >
              <RenderCondition condition={subCondition} depth={depth + 1} />
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
      <RenderCondition condition={capture.condition} />
    </div>
  );
};
