import { Space, Typography, Alert, Form } from 'antd';
import React from 'react';
import { HandlerList } from './components/HandlerList';
import { AddHandlerButton } from './components/AddHandlerButton';

const { Title, Text } = Typography;

interface HandlerBehaviorProps {}

export const HandlerBehavior: React.FC<HandlerBehaviorProps> = () => {
    return (
        <Space direction="vertical" className="w-full">
            <Title level={5} className="mb-2">处理行为</Title>
            <Text type="secondary" className="mb-4 block">
                定义当请求匹配规则时要执行的处理动作，可以添加多个处理器
            </Text>

            <Form.List name="handlers">
                {(fields, { add, remove }) => (
                    <div className="space-y-4">
                        <HandlerList fields={fields} remove={remove} />
                        <AddHandlerButton add={add} />
                    </div>
                )}
            </Form.List>
        </Space>
    );
};
