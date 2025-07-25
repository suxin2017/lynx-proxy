import { Space, Typography, Tabs, Form } from 'antd';
import React from 'react';
import { SimpleCaptureCondition } from './SimpleCaptureCondition';
import { ComplexCaptureRule } from './ComplexCaptureRule';
import {
  ComplexCaptureRule as ComplexCaptureRuleType,
  SimpleCaptureCondition as SimpleCaptureConditionType,
} from '@/services/generated/utoipaAxum.schemas';
import { useI18n } from '@/contexts';

const { Title, Text } = Typography;

export const CaptureRule: React.FC = () => {
  const { t } = useI18n();

  return (
    <Space direction="vertical" className="">
      <Title level={5} className="m-0">
        {t('ruleManager.createRuleDrawer.captureRule.title')}
      </Title>
      <Text type="secondary" className="mb-4 block">
        {t('ruleManager.createRuleDrawer.captureRule.description')}
      </Text>

      <Form.Item name={['capture', 'type']} noStyle valuePropName="activeKey">
        <Tabs
          className=""
          items={[
            {
              key: 'simple',
              label: t('ruleManager.createRuleDrawer.captureRule.simpleRule'),
              children: (
                <Form.Item
                  name={['capture', 'simpleCondition']}
                  rules={[
                    {
                      validator: (_, value?: SimpleCaptureConditionType) => {
                        if (
                          !value?.headers &&
                          !value?.urlPattern &&
                          !value?.host &&
                          !value?.method
                        ) {
                          return Promise.reject(
                            new Error(
                              t(
                                'ruleManager.createRuleDrawer.captureRule.addAtLeastOneCondition',
                              ),
                            ),
                          );
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <SimpleCaptureCondition />
                </Form.Item>
              ),
            },
            {
              key: 'complex',
              label: t('ruleManager.createRuleDrawer.captureRule.complexRule'),
              children: (
                <Form.Item
                  name={['capture', 'complexCondition']}
                  rules={[
                    {
                      validator: (_, value: ComplexCaptureRuleType) => {
                        if (
                          !value?.conditions ||
                          value.conditions.length === 0
                        ) {
                          return Promise.reject(
                            new Error(
                              t(
                                'ruleManager.createRuleDrawer.captureRule.addAtLeastOneCondition',
                              ),
                            ),
                          );
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <ComplexCaptureRule />
                </Form.Item>
              ),
            },
          ]}
        />
      </Form.Item>
    </Space>
  );
};
