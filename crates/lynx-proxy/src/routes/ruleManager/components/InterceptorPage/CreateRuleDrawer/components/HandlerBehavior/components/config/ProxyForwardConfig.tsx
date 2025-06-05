import React from 'react';
import { Form, Input, Typography } from 'antd';
import { useI18n } from '@/contexts';

const { Text } = Typography;

interface ProxyForwardConfigProps {
  field: {
    key: number;
    name: number;
  };
}

export const ProxyForwardConfig: React.FC<ProxyForwardConfigProps> = ({
  field,
}) => {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Form.Item
          name={[field.name, 'handlerType', 'targetScheme']}
          label={t(
            'ruleManager.createRuleDrawer.handlerBehavior.proxyForward.scheme',
          )}
          rules={[{ required: false }]}
        >
          <Input placeholder="https" />
        </Form.Item>

        <Form.Item
          name={[field.name, 'handlerType', 'targetAuthority']}
          label={t(
            'ruleManager.createRuleDrawer.handlerBehavior.proxyForward.authority',
          )}
          rules={[
            {
              required: true,
              message: t(
                'ruleManager.createRuleDrawer.handlerBehavior.proxyForward.authorityRequired',
              ),
            },
          ]}
        >
          <Input placeholder="example.com:443" />
        </Form.Item>

        <Form.Item
          name={[field.name, 'handlerType', 'targetPath']}
          label={t(
            'ruleManager.createRuleDrawer.handlerBehavior.proxyForward.path',
          )}
          rules={[{ required: false }]}
        >
          <Input placeholder="/api" />
        </Form.Item>
      </div>

      <div className="text-sm text-gray-500">
        <Text type="secondary">
          {t(
            'ruleManager.createRuleDrawer.handlerBehavior.proxyForward.description',
          )}
        </Text>
      </div>
    </div>
  );
};
