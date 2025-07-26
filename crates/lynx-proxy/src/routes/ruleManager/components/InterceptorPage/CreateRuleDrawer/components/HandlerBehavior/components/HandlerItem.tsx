import { HandlerRule } from '@/services/generated/utoipaAxum.schemas';
import {
  DeleteOutlined,
} from '@ant-design/icons';
import { Button, Card, Form, Switch, Typography } from 'antd';
import React from 'react';
import { HandlerConfig } from './config';
import { useI18n } from '@/contexts';

const { Text } = Typography;

interface HandlerItemProps {
  field: {
    key: number;
    name: number;
  };
  index: number;
  onDelete: () => void;
  isDragging?: boolean;
}

export const HandlerItem: React.FC<HandlerItemProps> = React.memo(
  ({ field, index, onDelete }) => {
    const form = Form.useFormInstance();
    const handlerData: HandlerRule = Form.useWatch(
      ['handlers', field.name],
      form,
    );
    const { t } = useI18n();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getHandlerTypeDisplayName = (handlerType: any) => {
      if (!handlerType?.type) return t('ruleManager.handlerTypes.unknown');

      const typeMap = {
        block: t('ruleManager.handlerTypes.block'),
        delay: t('ruleManager.handlerTypes.delay'),
        modifyRequest: t('ruleManager.handlerTypes.modifyRequest'),
        modifyResponse: t('ruleManager.handlerTypes.modifyResponse'),
        localFile: t('ruleManager.handlerTypes.localFile'),
        proxyForward: t('ruleManager.handlerTypes.proxyForward'),
        htmlScriptInjector: t('ruleManager.handlerTypes.htmlScriptInjector'),
      };

      return (
        typeMap[handlerType.type as keyof typeof typeMap] ||
        t('ruleManager.handlerTypes.unknown')
      );
    };

    return (
      <Card size="small" className="handler-item">
        {/* 头部 */}
        <div className="flex items-center justify-between py-3 bg-gray-50 rounded-lg mb-3">
          <div className="flex items-center">
            <Text strong>
              {getHandlerTypeDisplayName(handlerData?.handlerType)}
            </Text>
          </div>
          <div className="flex items-center space-x-2">
            <Form.Item
              name={[field.name, 'enabled']}
              valuePropName="checked"
              noStyle
            >
              <Switch size="small" />
            </Form.Item>
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={onDelete}
              title={t('ruleManager.createRuleDrawer.handlerBehavior.handlerItem.delete')}
            />
          </div>
        </div>
        {/* 配置内容 */}
        <div>
          {handlerData && (
            <HandlerConfig field={field} handler={handlerData?.handlerType} />
          )}
        </div>
      </Card>
    );
  },
);

HandlerItem.displayName = 'HandlerItem';
