import { Form, Input, Slider, Space, Switch, Typography } from 'antd';
import React from 'react';
import { formValidationRules } from '../types';
import { useI18n } from '@/contexts';

const { Title, Text } = Typography;

interface BasicInfoProps {}

export const BasicInfo: React.FC<BasicInfoProps> = () => {
  const { t } = useI18n();

  return (
    <Space direction="vertical" className="w-full">
      <Title level={5} className="mt-0 mb-2">
        {t('ruleManager.createRuleDrawer.basicInfo.title')}
      </Title>
      <Text type="secondary" className="mb-4 block">
        {t('ruleManager.createRuleDrawer.basicInfo.description')}
      </Text>

      <Form.Item
        name="name"
        label={t('ruleManager.createRuleDrawer.basicInfo.ruleName')}
        rules={formValidationRules.name}
      >
        <Input
          placeholder={t(
            'ruleManager.createRuleDrawer.basicInfo.ruleNamePlaceholder',
          )}
        />
      </Form.Item>

      <Form.Item
        name="description"
        label={t('ruleManager.createRuleDrawer.basicInfo.ruleDescription')}
        rules={formValidationRules.description}
      >
        <Input.TextArea
          rows={3}
          placeholder={t(
            'ruleManager.createRuleDrawer.basicInfo.ruleDescriptionPlaceholder',
          )}
          maxLength={500}
          showCount
        />
      </Form.Item>

      <div className="mb-4 flex items-center justify-between">
        <div>
          <Title level={5} className="m-0">
            {t('ruleManager.createRuleDrawer.basicInfo.enableRule')}
          </Title>
          <Text type="secondary" className="mb-0">
            {t('ruleManager.createRuleDrawer.basicInfo.enableDescription')}
          </Text>
        </div>
        <div>
          <Form.Item
            name="enabled"
            label={t('ruleManager.createRuleDrawer.basicInfo.enableStatus')}
            valuePropName="checked"
            tooltip={t('ruleManager.createRuleDrawer.basicInfo.enableTooltip')}
            noStyle
          >
            <Switch />
          </Form.Item>
        </div>
      </div>

      <Form.Item
        name="priority"
        label={t('ruleManager.createRuleDrawer.basicInfo.priority')}
        tooltip={t('ruleManager.createRuleDrawer.basicInfo.priorityTooltip')}
        rules={formValidationRules.priority}
      >
        <Slider
          className="[&_.ant-slider-handle:after]:h-[12px] [&_.ant-slider-handle:after]:w-[12px]"
          styles={{
            tracks: {
              height: 8,
              borderRadius: 4,
            },
            track: {
              height: 8,
              borderRadius: 4,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            },
            rail: {
              height: 8,
              borderRadius: 4,
            },
          }}
          min={0}
          max={100}
          step={10}
        />
      </Form.Item>
    </Space>
  );
};
