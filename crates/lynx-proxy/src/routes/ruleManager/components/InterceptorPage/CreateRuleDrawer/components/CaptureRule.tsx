import { Space, Typography, Tabs, Form } from 'antd';
import React from 'react';
import { SimpleCaptureCondition } from './SimpleCaptureCondition';
import { ComplexCaptureRule } from './ComplexCaptureRule';
import { ComplexCaptureRule as ComplexCaptureRuleType, SimpleCaptureCondition as SimpleCaptureConditionType } from '@/services/generated/utoipaAxum.schemas';

const { Title, Text } = Typography;

export const CaptureRule: React.FC = () => {
    return (
        <Space direction="vertical" className="w-full">
            <Title level={5} className="m-0">捕获规则</Title>
            <Text type="secondary" className="mb-4 block">
                定义什么样的请求会被此规则匹配和处理
            </Text>

            <Form.Item name={['capture', 'type']} noStyle valuePropName="activeKey">
                <Tabs
                    className="w-full"
                    items={[
                        {
                            key: 'simple',
                            label: '简单规则',
                            children: (
                                <Form.Item
                                    name={['capture', 'simpleCondition']}
                                    rules={[
                                        {
                                            validator: (_, value?: SimpleCaptureConditionType) => {
                                                if (!value?.headers
                                                    && !value?.urlPattern
                                                    && !value?.host
                                                    && !value?.method
                                                ) {
                                                    return Promise.reject(new Error('请添加至少一个条件'));
                                                }
                                                return Promise.resolve();
                                            }
                                        }
                                    ]}
                                >
                                    <SimpleCaptureCondition />
                                </Form.Item>
                            ),
                        },
                        {
                            key: 'complex',
                            label: '复杂规则',
                            children: (
                                <Form.Item
                                    name={['capture', 'complexCondition']}
                                    rules={[
                                        {
                                            validator: (_, value: ComplexCaptureRuleType) => {
                                                if (!value?.conditions || value.conditions.length === 0) {
                                                    return Promise.reject(new Error('请添加至少一个条件'));
                                                }
                                                return Promise.resolve();
                                            }
                                        }
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
