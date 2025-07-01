import { Space, Typography, Form } from 'antd';
import React from 'react';
import { HandlerList } from './components/HandlerList';
import { AddHandlerButton } from './components/AddHandlerButton';
import { useI18n } from '@/contexts';

const { Title, Text } = Typography;

interface HandlerBehaviorProps { }

export const HandlerBehavior: React.FC<HandlerBehaviorProps> = () => {
  const { t } = useI18n();

  return (
    <Space direction="vertical" className="w-full">
      <Title level={5} className="mb-2">
        {t('ruleManager.createRuleDrawer.handlerBehavior.title')}
      </Title>
      <Text type="secondary" className="mb-4 block">
        {t('ruleManager.createRuleDrawer.handlerBehavior.description')}
      </Text>

      <Form.List name="handlers">
        {(fields, { add, remove }) => (
          <div className="space-y-4">
            <AddHandlerButton add={add} />
            <HandlerList fields={fields} remove={remove} />
          </div>
        )}
      </Form.List>
    </Space>
  );
};
