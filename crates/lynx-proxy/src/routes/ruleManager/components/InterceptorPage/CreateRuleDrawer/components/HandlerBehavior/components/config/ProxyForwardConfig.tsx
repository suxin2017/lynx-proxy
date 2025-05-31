import React from 'react';
import { Form, Input, Switch, InputNumber, Typography, Alert } from 'antd';

const { Text } = Typography;

interface ProxyForwardConfigProps {
    field: {
        key: number;
        name: number;
    };
}

export const ProxyForwardConfig: React.FC<ProxyForwardConfigProps> = ({ field }) => {
    const commonProxyPorts = [
        { value: 8080, label: '8080 (HTTP代理)' },
        { value: 3128, label: '3128 (Squid代理)' },
        { value: 8888, label: '8888 (代理工具)' },
        { value: 9090, label: '9090 (自定义代理)' }
    ];

    return (
        <div className="space-y-4">
            <Text strong>代理转发配置</Text>
            
            <Alert
                message="代理转发说明"
                description="将请求转发到指定的代理服务器，代理服务器将代为处理请求并返回响应。"
                type="info"
                showIcon
                className="mb-4"
            />

            <div className="space-y-4">
                <Form.Item
                    name={[field.name, 'handlerType', 'proxyUrl']}
                    label="代理服务器地址"
                    rules={[
                        { required: true, message: '请输入代理服务器地址' },
                        { type: 'url', message: '请输入有效的URL地址' }
                    ]}
                    extra="支持 HTTP/HTTPS/SOCKS5 代理"
                >
                    <Input placeholder="http://proxy.example.com:8080 或 socks5://127.0.0.1:1080" />
                </Form.Item>

                <div className="grid grid-cols-2 gap-4">
                    <Form.Item
                        name={[field.name, 'handlerType', 'timeout']}
                        label="超时时间(秒)"
                        rules={[
                            { type: 'number', min: 1, max: 300, message: '超时时间必须在1-300秒之间' }
                        ]}
                    >
                        <InputNumber
                            placeholder="30"
                            min={1}
                            max={300}
                            className="w-full"
                            addonAfter="秒"
                        />
                    </Form.Item>

                    <Form.Item
                        name={[field.name, 'handlerType', 'retries']}
                        label="重试次数"
                        rules={[
                            { type: 'number', min: 0, max: 5, message: '重试次数必须在0-5次之间' }
                        ]}
                    >
                        <InputNumber
                            placeholder="2"
                            min={0}
                            max={5}
                            className="w-full"
                            addonAfter="次"
                        />
                    </Form.Item>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                    <Text strong className="block mb-3">认证设置</Text>
                    
                    <Form.Item
                        name={[field.name, 'handlerType', 'authRequired']}
                        label="需要认证"
                        valuePropName="checked"
                        className="mb-3"
                    >
                        <Switch />
                    </Form.Item>

                    <Form.Item shouldUpdate className="mb-0">
                        {(form) => {
                            const authRequired = form.getFieldValue([
                                'handlers', 
                                field.name, 
                                'handlerType', 
                                'authRequired'
                            ]);
                            
                            if (!authRequired) return null;

                            return (
                                <div className="grid grid-cols-2 gap-4">
                                    <Form.Item
                                        name={[field.name, 'handlerType', 'username']}
                                        label="用户名"
                                        rules={[{ required: authRequired, message: '请输入用户名' }]}
                                        className="mb-0"
                                    >
                                        <Input placeholder="代理服务器用户名" />
                                    </Form.Item>
                                    
                                    <Form.Item
                                        name={[field.name, 'handlerType', 'password']}
                                        label="密码"
                                        rules={[{ required: authRequired, message: '请输入密码' }]}
                                        className="mb-0"
                                    >
                                        <Input.Password placeholder="代理服务器密码" />
                                    </Form.Item>
                                </div>
                            );
                        }}
                    </Form.Item>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                    <Text strong className="block mb-3">高级设置</Text>
                    
                    <div className="space-y-3">
                        <Form.Item
                            name={[field.name, 'handlerType', 'preserveHost']}
                            label="保持原始Host头"
                            valuePropName="checked"
                            className="mb-0"
                            extra="是否在转发时保持原始请求的Host头"
                        >
                            <Switch />
                        </Form.Item>

                        <Form.Item
                            name={[field.name, 'handlerType', 'followRedirects']}
                            label="跟随重定向"
                            valuePropName="checked"
                            className="mb-0"
                            extra="代理服务器遇到重定向时是否自动跟随"
                        >
                            <Switch />
                        </Form.Item>

                        <Form.Item
                            name={[field.name, 'handlerType', 'userAgent']}
                            label="自定义User-Agent"
                            className="mb-0"
                        >
                            <Input placeholder="可选：自定义请求的User-Agent" />
                        </Form.Item>
                    </div>
                </div>
            </div>
            
            <div className="text-sm text-gray-500">
                <Text type="secondary">
                    代理转发将把请求发送到指定的代理服务器。请确保代理服务器地址正确且可访问。
                </Text>
            </div>
        </div>
    );
};
