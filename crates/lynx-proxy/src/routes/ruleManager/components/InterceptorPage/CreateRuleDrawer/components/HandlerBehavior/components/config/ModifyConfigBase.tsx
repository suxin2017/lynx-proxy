import React from 'react';
import { Form, Input, Button, Typography, Select, Collapse } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;

interface ModifyConfigBaseProps {
    field: {
        key: number;
        name: number;
    };
    type: 'request' | 'response';
}

export const ModifyConfigBase: React.FC<ModifyConfigBaseProps> = ({ field, type }) => {
    const isResponse = type === 'response';
    const isRequest = type === 'request';

    const commonStatusCodes = [
        { value: 200, label: '200 OK' },
        { value: 201, label: '201 Created' },
        { value: 400, label: '400 Bad Request' },
        { value: 401, label: '401 Unauthorized' },
        { value: 403, label: '403 Forbidden' },
        { value: 404, label: '404 Not Found' },
        { value: 500, label: '500 Internal Server Error' },
        { value: 502, label: '502 Bad Gateway' },
        { value: 503, label: '503 Service Unavailable' }
    ];

    const httpMethods = [
        { value: 'GET', label: 'GET' },
        { value: 'POST', label: 'POST' },
        { value: 'PUT', label: 'PUT' },
        { value: 'DELETE', label: 'DELETE' },
        { value: 'PATCH', label: 'PATCH' },
        { value: 'HEAD', label: 'HEAD' },
        { value: 'OPTIONS', label: 'OPTIONS' }
    ];

    const collapseItems = [
        // 状态码配置 - 只在响应类型时显示
        ...(isResponse ? [{
            key: 'status',
            label: '状态码',
            children: (
                <div className="space-y-4">
                    <Text type="secondary">修改响应状态码</Text>
                    <Form.Item
                        name={[field.name, 'handlerType', 'statusCode']}
                        label="状态码"
                        rules={[
                            { type: 'number', min: 100, max: 599, message: '状态码必须在100-599之间' }
                        ]}
                    >
                        <Select
                            placeholder="选择或输入状态码"
                            options={commonStatusCodes}
                            showSearch
                            allowClear
                        />
                    </Form.Item>
                </div>
            )
        }] : []),

        // 请求头/响应头配置
        {
            key: 'headers',
            label: isResponse ? '响应头' : '请求头',
            children: (
                <div className="space-y-4">
                    <Text type="secondary">修改{isResponse ? '响应头' : '请求头'}信息</Text>
                    <Form.List name={[field.name, 'handlerType', 'modifyHeaders']}>
                        {(headerFields, { add: addHeader, remove: removeHeader }) => (
                            <div className="space-y-2">
                                {headerFields.map(({ key, name }) => (
                                    <div key={key} className="flex items-center space-x-2">
                                        <Form.Item
                                            name={[name, 'key']}
                                            className="flex-1 mb-0"
                                            rules={[{ required: true, message: `请输入${isResponse ? '响应头' : '请求头'}名称` }]}
                                        >
                                            <Input placeholder={`${isResponse ? '响应头' : '请求头'}名称 (如: ${isResponse ? 'Content-Type' : 'User-Agent'})`} />
                                        </Form.Item>
                                        <Form.Item
                                            name={[name, 'value']}
                                            className="flex-1 mb-0"
                                            rules={[{ required: true, message: `请输入${isResponse ? '响应头' : '请求头'}值` }]}
                                        >
                                            <Input placeholder={`${isResponse ? '响应头' : '请求头'}值`} />
                                        </Form.Item>
                                        <Button
                                            type="text"
                                            danger
                                            icon={<DeleteOutlined />}
                                            onClick={() => removeHeader(name)}
                                        />
                                    </div>
                                ))}
                                <Button
                                    type="dashed"
                                    onClick={() => addHeader()}
                                    icon={<PlusOutlined />}
                                    block
                                >
                                    添加{isResponse ? '响应头' : '请求头'}
                                </Button>
                            </div>
                        )}
                    </Form.List>
                </div>
            )
        },

        // 请求方法配置 - 只在请求类型时显示
        ...(isRequest ? [{
            key: 'method',
            label: '请求方法',
            children: (
                <div className="space-y-4">
                    <Text type="secondary">修改HTTP请求方法</Text>
                    <Form.Item
                        name={[field.name, 'handlerType', 'modifyMethod']}
                        label="新的请求方法"
                    >
                        <Select
                            placeholder="选择请求方法"
                            options={httpMethods}
                            allowClear
                        />
                    </Form.Item>
                </div>
            )
        }] : []),

        // URL配置 - 只在请求类型时显示
        ...(isRequest ? [{
            key: 'url',
            label: '请求URL',
            children: (
                <div className="space-y-4">
                    <Text type="secondary">修改请求的URL地址</Text>
                    <Form.Item
                        name={[field.name, 'handlerType', 'modifyUrl']}
                        label="新的URL"
                        rules={[
                            { type: 'url', message: '请输入有效的URL地址' }
                        ]}
                    >
                        <Input placeholder="https://example.com/new-path" />
                    </Form.Item>
                </div>
            )
        }] : []),

        // 请求体/响应体配置
        {
            key: 'body',
            label: isResponse ? '响应体' : '请求体',
            children: (
                <div className="space-y-4">
                    <Text type="secondary">修改{isResponse ? '响应体' : '请求体'}内容</Text>
                    <Form.Item
                        name={[field.name, 'handlerType', 'modifyBody']}
                        label={`新的${isResponse ? '响应体' : '请求体'}`}
                    >
                        <TextArea
                            rows={isResponse ? 8 : 6}
                            placeholder={`输入新的${isResponse ? '响应体' : '请求体'}内容 (JSON、${isResponse ? 'HTML、XML、' : 'XML、'}文本等)`}
                        />
                    </Form.Item>
                    
                    {/* Content-Type 和字符编码配置 - 只在响应类型时显示 */}
                    {isResponse && (
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item
                                name={[field.name, 'handlerType', 'contentType']}
                                label="Content-Type"
                            >
                                <Select
                                    placeholder="选择内容类型"
                                    allowClear
                                    options={[
                                        { value: 'application/json', label: 'application/json' },
                                        { value: 'text/html', label: 'text/html' },
                                        { value: 'text/plain', label: 'text/plain' },
                                        { value: 'application/xml', label: 'application/xml' },
                                        { value: 'application/javascript', label: 'application/javascript' },
                                        { value: 'text/css', label: 'text/css' }
                                    ]}
                                    showSearch
                                />
                            </Form.Item>
                            <Form.Item
                                name={[field.name, 'handlerType', 'charset']}
                                label="字符编码"
                            >
                                <Select
                                    placeholder="选择字符编码"
                                    allowClear
                                    options={[
                                        { value: 'utf-8', label: 'UTF-8' },
                                        { value: 'gbk', label: 'GBK' },
                                        { value: 'iso-8859-1', label: 'ISO-8859-1' }
                                    ]}
                                />
                            </Form.Item>
                        </div>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-4">
            <Text strong>修改{isResponse ? '响应' : '请求'}配置</Text>
            
            <Collapse
                items={collapseItems}
                size="small"
                defaultActiveKey={['headers', 'body']} // 默认展开头部和主体
                ghost
            />
            
            <div className="text-sm text-gray-500">
                <Text type="secondary">
                    可以选择性地修改{isResponse ? '响应' : '请求'}的不同部分。留空的字段将保持原始值不变。
                </Text>
            </div>
        </div>
    );
};
