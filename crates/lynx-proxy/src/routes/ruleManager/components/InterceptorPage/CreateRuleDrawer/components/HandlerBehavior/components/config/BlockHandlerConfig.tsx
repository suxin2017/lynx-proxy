import React from 'react';
import { Form, InputNumber, Input, Typography } from 'antd';

const { Text } = Typography;

interface BlockHandlerConfigProps {
    field: {
        key: number;
        name: number;
    };
}

export const BlockHandlerConfig: React.FC<BlockHandlerConfigProps> = ({ field }) => {
    return (
        <div className="space-y-4">
            <Text strong>阻止请求配置</Text>
            
            <div className="grid grid-cols-2 gap-4">
                <Form.Item
                    name={[field.name, 'handlerType', 'statusCode']}
                    label="状态码"
                    rules={[
                        { required: true, message: '请输入状态码' },
                        { type: 'number', min: 100, max: 599, message: '状态码必须在100-599之间' }
                    ]}
                >
                    <InputNumber
                        placeholder="403"
                        min={100}
                        max={599}
                        className="w-full"
                    />
                </Form.Item>
                
                <Form.Item
                    name={[field.name, 'handlerType', 'reason']}
                    label="阻止原因"
                    rules={[{ required: false }]}
                >
                    <Input placeholder="Access blocked by proxy" />
                </Form.Item>
            </div>
            
            <div className="text-sm text-gray-500">
                <Text type="secondary">
                    阻止请求将返回指定的HTTP状态码和原因，常用状态码：403 (禁止访问)、404 (未找到)、503 (服务不可用)
                </Text>
            </div>
        </div>
    );
};
