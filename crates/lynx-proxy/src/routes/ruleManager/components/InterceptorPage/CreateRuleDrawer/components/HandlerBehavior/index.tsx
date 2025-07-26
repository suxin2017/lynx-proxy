import { useI18n } from '@/contexts';
import { Form, Typography } from 'antd';
import React from 'react';
import { AddHandlerButton } from './components/AddHandlerButton';
import { HandlerList } from './components/HandlerList';

const { Title, Text } = Typography;

interface HandlerBehaviorProps { }

export const HandlerBehavior: React.FC<HandlerBehaviorProps> = () => {
  const { t } = useI18n();

  return (
    <Form.List name="handlers">
      {(fields, { add, remove }) => (
        <div>
          <div className='flex justify-between items-center'>
            <Title level={5} className="m-0">
              {t('ruleManager.createRuleDrawer.handlerBehavior.title')}
            </Title>
            <AddHandlerButton add={add} />
          </div>
          <Text type="secondary" className="mb-4 block">
            {t('ruleManager.createRuleDrawer.handlerBehavior.description')}
          </Text>
          <HandlerList fields={fields} remove={remove} />
        </div>
      )}
    </Form.List>
  );
};
