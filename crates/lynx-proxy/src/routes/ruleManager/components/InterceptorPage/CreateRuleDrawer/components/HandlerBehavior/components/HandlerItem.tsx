import { HandlerRule } from '@/services/generated/utoipaAxum.schemas';
import {
  CaretDownOutlined,
  CaretLeftOutlined,
  CaretUpOutlined,
  DeleteOutlined,
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { Button, Card, Form, Switch, Typography } from 'antd';
import React from 'react';
import { HandlerConfig } from './config';
import { useI18n } from '@/contexts';
import { useHandlerCollapse } from './handlerCollapseContext';

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
    const { toggleExpand, isExpanded } = useHandlerCollapse();
    const expanded = isExpanded(index);

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getHandlerDescription = (handlerType: any) => {
      if (!handlerType?.type) return '';

      const descMap = {
        block:
          t('ruleManager.handlerDescriptions.statusCode', {
            code: handlerType.statusCode || 403,
          }) +
          ', ' +
          t('ruleManager.handlerDescriptions.reason'),
        delay: t('ruleManager.handlerDescriptions.delay', {
          delayMs: handlerType.delayMs || 1000,
          delayType: handlerType.delayType || 'beforeRequest',
        }),
        modifyRequest: t('ruleManager.handlerDescriptions.modifyRequest'),
        modifyResponse: t('ruleManager.handlerDescriptions.modifyResponse'),
        localFile: t('ruleManager.handlerDescriptions.file', {
          path:
            handlerType.filePath ||
            t(
              'ruleManager.createRuleDrawer.handlerBehavior.handlerItem.notSet',
            ),
        }),
        proxyForward: t('ruleManager.handlerDescriptions.forwardTo', {
          host:
            (handlerType.targetScheme ? handlerType.targetScheme + '://' : '') +
            handlerType.targetAuthority ||
            t(
              'ruleManager.createRuleDrawer.handlerBehavior.handlerItem.notSet',
            ),
        }),
        htmlScriptInjector: t(
          'ruleManager.handlerDescriptions.htmlScriptInjector',
        ),
      };

      return descMap[handlerType.type as keyof typeof descMap] || '';
    };

    const handleToggleExpand = () => {
      toggleExpand(index);
    };

    return (
      <Card size="small" className="handler-item">
        {/* 折叠面板头部 */}
        <div className="flex items-center justify-between py-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors duration-200" onClick={handleToggleExpand}>
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
              <Switch
                size="small"
                onClick={(checked, e) => e.stopPropagation()}
              />
            </Form.Item>
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title={t('ruleManager.createRuleDrawer.handlerBehavior.handlerItem.delete')}
            />
            <Button
              type="text"
              size="small"
              icon={expanded ? <CaretLeftOutlined /> : <CaretDownOutlined />}
              title={expanded ? t('ruleManager.createRuleDrawer.handlerBehavior.handlerItem.collapse') : t('ruleManager.createRuleDrawer.handlerBehavior.handlerItem.expand')}
            />
          </div>
        </div>
        {/* 预览内容 - 仅在未展开时显示 */}
        {!expanded && (
          <div className="space-y-2 mb-4">
            <div>
              <Text strong>
                {t(
                  'ruleManager.createRuleDrawer.handlerBehavior.handlerItem.name',
                )}
                :{' '}
              </Text>
              <Text>
                {handlerData?.name ||
                  t(
                    'ruleManager.createRuleDrawer.handlerBehavior.handlerItem.unnamed',
                  )}
              </Text>
            </div>
            {handlerData?.description && (
              <div>
                <Text strong>
                  {t(
                    'ruleManager.createRuleDrawer.handlerBehavior.handlerItem.description',
                  )}
                  :{' '}
                </Text>
                <Text type="secondary">{handlerData.description}</Text>
              </div>
            )}
            <div>
              <Text strong>
                {t(
                  'ruleManager.createRuleDrawer.handlerBehavior.handlerItem.configuration',
                )}
                :{' '}
              </Text>
              <Text type="secondary">
                {getHandlerDescription(handlerData?.handlerType)}
              </Text>
            </div>
          </div>
        )}
        {/* 折叠内容区域 */}
        <div
          className={`grid transition-all duration-100 ease-in-out ${expanded ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0'
            }`}
        >
          <div className="overflow-hidden">
            {handlerData && (
              <HandlerConfig field={field} handler={handlerData?.handlerType} />
            )}
          </div>
        </div>
      </Card>
    );
  },
);

HandlerItem.displayName = 'HandlerItem';
