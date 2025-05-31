import { Card, Form, Input, InputNumber, Switch, Space, Typography, Row, Col, Slider } from 'antd';
import React from 'react';
import { CreateRuleFormValues, formValidationRules } from '../types';

const { Title, Text } = Typography;

interface BasicInfoProps {
}

export const BasicInfo: React.FC<BasicInfoProps> = () => {
    return (
        <Space direction="vertical" className="w-full">
            <Title level={5} className="mt-0 mb-2">基础信息</Title>
            <Text type="secondary" className="mb-4 block">
                配置规则的基本属性，包括名称、描述和执行优先级
            </Text>

            <Form.Item
                name="name"
                label="规则名称"
                rules={formValidationRules.name}
            >
                <Input placeholder="请输入规则名称" />
            </Form.Item>

            <Form.Item
                name="description"
                label="规则描述"
                rules={formValidationRules.description}
            >
                <Input.TextArea
                    rows={3}
                    placeholder="请输入规则描述（可选）"
                    maxLength={500}
                    showCount
                />
            </Form.Item>


            <div className='flex items-center justify-between mb-4'>
                <div>
                    <Title level={5} className="m-0">
                        启用规则
                    </Title>
                    <Text type="secondary" className="mb-0">
                        规则是否立即生效
                    </Text>
                </div>
                <div>
                    <Form.Item
                        name="enabled"
                        label="启用状态"
                        valuePropName="checked"
                        tooltip="关闭后该规则将不会被执行"
                        noStyle
                    >
                        <Switch />
                    </Form.Item>
                </div>
            </div>


            <Form.Item
                name="priority"
                label="优先级"
                tooltip="数值越大优先级越高，范围：0-100"
                rules={formValidationRules.priority}
            >
                <Slider
                    className="[&_.ant-slider-handle:after]:w-[12px] [&_.ant-slider-handle:after]:h-[12px]"
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
