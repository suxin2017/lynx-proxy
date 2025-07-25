import React from 'react';
import { Form, InputNumber, Input, Typography } from 'antd';
import { useI18n } from '@/contexts';

const { Text } = Typography;

interface BlockHandlerConfigProps {
  field: {
    key: number;
    name: number;
  };
}

export const BlockHandlerConfig: React.FC<BlockHandlerConfigProps> = ({
  field,
}) => {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <Text strong>
        {t('ruleManager.createRuleDrawer.handlerBehavior.blockHandler.title')}
      </Text>

      <div className="grid grid-cols-2 gap-4">
        <Form.Item
          name={[field.name, 'handlerType', 'statusCode']}
          label={t(
            'ruleManager.createRuleDrawer.handlerBehavior.blockHandler.statusCode',
          )}
          rules={[
            {
              required: true,
              message: t(
                'ruleManager.createRuleDrawer.handlerBehavior.blockHandler.statusCodeRequired',
              ),
            },
            {
              type: 'number',
              min: 100,
              max: 599,
              message: t(
                'ruleManager.createRuleDrawer.handlerBehavior.blockHandler.statusCodeRange',
              ),
            },
          ]}
        >
          <InputNumber
            placeholder="403"
            min={100}
            max={599}
            className=""
          />
        </Form.Item>

        <Form.Item
          name={[field.name, 'handlerType', 'reason']}
          label={t(
            'ruleManager.createRuleDrawer.handlerBehavior.blockHandler.reason',
          )}
          rules={[{ required: false }]}
        >
          <Input placeholder="Access blocked by proxy" />
        </Form.Item>
      </div>

      <div className="text-sm text-gray-500">
        <Text type="secondary">
          {t(
            'ruleManager.createRuleDrawer.handlerBehavior.blockHandler.description',
          )}
        </Text>
      </div>
    </div>
  );
};
