import React, { useState, useCallback, useMemo } from 'react';
import { Input, Select, Space, Typography, Button } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { SimpleCaptureCondition as SimpleCaptureConditionType } from '@/services/generated/utoipaAxum.schemas';

const { Text } = Typography;
const { Option } = Select;

interface SimpleCaptureConditionProps {
    value?: SimpleCaptureConditionType;
    onChange?: (value: SimpleCaptureConditionType) => void;
    titleExtra?: React.ReactNode;
}

const UrlPatternInput = React.memo(({ urlPattern, onChange, onRemove }: {
    urlPattern?: { captureType?: string; pattern?: string };
    onChange: (data: { captureType?: string; pattern?: string }) => void;
    onRemove?: () => void;
}) => (
    <div className="w-full">
        <div className="flex justify-between items-center mb-2">
            <Text strong className="block">URL 模式</Text>
            {onRemove && (
                <Button type="text" size="small" danger onClick={onRemove}>移除</Button>
            )}
        </div>
        <Space direction="vertical" className="w-full">
            <div className="flex gap-2">
                <Select
                    placeholder="选择匹配类型"
                    className="w-32"
                    value={urlPattern?.captureType || 'glob'}
                    onChange={(captureType) => onChange({ captureType: captureType })}
                >
                    <Option value="glob">Glob</Option>
                    <Option value="regex">Regex</Option>
                    <Option value="exact">精确匹配</Option>
                    <Option value="contains">包含</Option>
                </Select>
                <Input
                    placeholder="输入URL模式，如: /api/* 或 *.example.com"
                    className="flex-1"
                    value={urlPattern?.pattern || ''}
                    onChange={(e) => onChange({ pattern: e.target.value })}
                />
            </div>
            <Text type="secondary" className="text-xs">
                {(urlPattern?.captureType || 'glob') === 'glob' && '使用通配符: * 匹配任意字符, ? 匹配单个字符'}
                {(urlPattern?.captureType || 'glob') === 'regex' && '使用正则表达式语法'}
                {(urlPattern?.captureType || 'glob') === 'exact' && '精确匹配完整URL'}
                {(urlPattern?.captureType || 'glob') === 'contains' && '检查URL是否包含指定字符串'}
            </Text>
        </Space>
    </div>
));

const MethodInput = React.memo(({ value, onChange, onRemove }: {
    value?: string;
    onChange: (method: string | null) => void;
    onRemove: () => void;
}) => (
    <div className="w-full">
        <div className="flex justify-between items-center mb-2">
            <Text strong>HTTP 方法</Text>
            <Button type="text" size="small" danger onClick={onRemove}>移除</Button>
        </div>
        <Select
            placeholder="选择HTTP方法（可选）"
            allowClear
            className="w-full mb-1"
            value={value || undefined}
            onChange={onChange}
        >
            <Option value="GET">GET</Option>
            <Option value="POST">POST</Option>
            <Option value="PUT">PUT</Option>
            <Option value="DELETE">DELETE</Option>
            <Option value="PATCH">PATCH</Option>
            <Option value="HEAD">HEAD</Option>
            <Option value="OPTIONS">OPTIONS</Option>
        </Select>
        <Text type="secondary" className="text-xs block">留空表示匹配所有HTTP方法</Text>
    </div>
));

const HostInput = React.memo(({ value, onChange, onRemove }: {
    value?: string;
    onChange: (host: string) => void;
    onRemove: () => void;
}) => (
    <div className="w-full">
        <div className="flex justify-between items-center mb-2">
            <Text strong>主机名</Text>
            <Button type="text" size="small" danger onClick={onRemove}>移除</Button>
        </div>
        <Input
            placeholder="输入主机名，如: api.example.com（可选）"
            className="mb-1"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
        />
        <Text type="secondary" className="text-xs block">留空表示匹配所有主机名</Text>
    </div>
));

const HeadersInput = React.memo(({ headers, onChange, onRemove, onAdd, onUpdate, onDelete }: {
    headers: Array<{ key: string; value: string }>;
    onChange: (headers: Array<{ key: string; value: string }>) => void;
    onRemove: () => void;
    onAdd: () => void;
    onUpdate: (index: number, key: string, value: string) => void;
    onDelete: (index: number) => void;
}) => (
    <div className="w-full">
        <div className="flex justify-between items-center mb-2">
            <Text strong>请求头</Text>
            <Button type="text" size="small" danger onClick={onRemove}>移除</Button>
        </div>
        {headers.length > 0 ? (
            <Space direction="vertical" className="w-full">
                {headers.map((header, index) => (
                    <div key={index} className="flex gap-2 items-center">
                        <Input
                            placeholder="Header名称"
                            className="flex-1"
                            value={header.key}
                            onChange={(e) => onUpdate(index, e.target.value, header.value)}
                        />
                        <Input
                            placeholder="Header值"
                            className="flex-1"
                            value={header.value}
                            onChange={(e) => onUpdate(index, header.key, e.target.value)}
                        />
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => onDelete(index)} />
                    </div>
                ))}
            </Space>
        ) : (
            <Text type="secondary" className="text-xs">没有设置请求头条件，点击"添加请求头"来添加请求头匹配条件</Text>
        )}
        <div className="mt-2">
            <Button type="dashed" icon={<PlusOutlined />} onClick={onAdd}>添加请求头</Button>
        </div>
    </div>
));

const AddFieldButtons = React.memo(({ showMethod, onShowUrlPattern, showUrlPattern, showHost, showHeaders, onShowMethod, onShowHost, onShowHeaders }: {
    showMethod: boolean;
    showHost: boolean;
    showHeaders: boolean;
    showUrlPattern: boolean;
    onShowMethod: () => void;
    onShowHost: () => void;
    onShowHeaders: () => void;
    onShowUrlPattern: () => void;
}) => (
    <div className="w-full">
        <Text type="secondary" className="block mb-2">添加可选条件</Text>
        <Space wrap>
            {!showMethod && (
                <Button type="dashed" icon={<PlusOutlined />} onClick={onShowMethod}>HTTP 方法</Button>
            )}
            {!showHost && (
                <Button type="dashed" icon={<PlusOutlined />} onClick={onShowHost}>主机名</Button>
            )}
            {!showHeaders && (
                <Button type="dashed" icon={<PlusOutlined />} onClick={onShowHeaders}>请求头</Button>
            )}
            {!showUrlPattern && (
                <Button type="dashed" icon={<PlusOutlined />} onClick={onShowUrlPattern}>
                    URL 模式
                </Button>
            )}
        </Space>
    </div>
));

export const SimpleCaptureCondition: React.FC<SimpleCaptureConditionProps> = React.memo(({ value = {
}, onChange }) => {
    const [showMethod, setShowMethod] = useState(!!value.method);
    const [showHost, setShowHost] = useState(!!value.host);
    const [showHeaders, setShowHeaders] = useState(!!value.headers);
    const [showUrlPattern, setShowUrlPattern] = useState(!!value.urlPattern);

    const handleChange = useCallback((field: keyof SimpleCaptureConditionType, fieldValue: any) => {
        const newValue = { ...value, [field]: fieldValue };
        onChange?.(newValue);
    }, [value, onChange]);

    const handleUrlPatternChange = useCallback((urlPatternData: { captureType?: string; pattern?: string }) => {
        const currentUrlPattern = value.urlPattern || { captureType: 'glob', pattern: '' };
        const newUrlPattern = {
            captureType: urlPatternData.captureType ?? currentUrlPattern.captureType ?? 'glob',
            pattern: urlPatternData.pattern ?? currentUrlPattern.pattern ?? ''
        };
        handleChange('urlPattern', newUrlPattern);
    }, [value.urlPattern, handleChange]);

    // 将后端格式转换为前端编辑格式
    const getHeadersAsArray = useCallback((): Array<{ key: string; value: string }> => {
        if (!value.headers) return [];
        return value.headers.map(header => {
            const [key, val] = Object.entries(header)[0] || ['', ''];
            return { key, value: val };
        });
    }, [value.headers]);

    const handleHeaderChange = useCallback((headers: Array<{ key: string; value: string }>) => {
        // 转换为后端期望的格式：Array<{ [key: string]: string }>
        const formattedHeaders = headers.map(header => ({
            [header.key]: header.value
        }));
        handleChange('headers', formattedHeaders.length > 0 ? formattedHeaders : null);
    }, [handleChange]);

    const addHeader = useCallback(() => {
        const currentHeaders = getHeadersAsArray();
        const newHeaders = [...currentHeaders, { key: '', value: '' }];
        handleHeaderChange(newHeaders);
    }, [getHeadersAsArray, handleHeaderChange]);

    const removeHeader = useCallback((index: number) => {
        const currentHeaders = getHeadersAsArray();
        const newHeaders = currentHeaders.filter((_, i) => i !== index);
        handleHeaderChange(newHeaders);
    }, [getHeadersAsArray, handleHeaderChange]);

    const updateHeader = useCallback((index: number, key: string, headerValue: string) => {
        const currentHeaders = getHeadersAsArray();
        const newHeaders = [...currentHeaders];
        newHeaders[index] = { key, value: headerValue };
        handleHeaderChange(newHeaders);
    }, [getHeadersAsArray, handleHeaderChange]);

    const headersArray = useMemo(() => getHeadersAsArray(), [getHeadersAsArray]);

    return (
        <Space direction="vertical" className="w-full" size="middle">
            {showUrlPattern && (
                <UrlPatternInput
                    urlPattern={value.urlPattern ? { ...value.urlPattern } : undefined}
                    onChange={handleUrlPatternChange}
                    onRemove={() => { setShowUrlPattern(false); handleChange('urlPattern', null); }}
                />
            )}
            {showMethod && (
                <MethodInput value={typeof value.method === 'string' ? value.method : undefined} onChange={(m) => handleChange('method', m)} onRemove={() => { setShowMethod(false); handleChange('method', null); }} />
            )}
            {showHost && (
                <HostInput value={typeof value.host === 'string' ? value.host : undefined} onChange={(h) => handleChange('host', h)} onRemove={() => { setShowHost(false); handleChange('host', null); }} />
            )}
            {showHeaders && (
                <HeadersInput
                    headers={headersArray}
                    onChange={handleHeaderChange}
                    onRemove={() => { setShowHeaders(false); handleChange('headers', null); }}
                    onAdd={addHeader}
                    onUpdate={updateHeader}
                    onDelete={removeHeader}
                />
            )}
            {(!showUrlPattern || !showHost || !showMethod || !showHeaders) && (
                <AddFieldButtons
                    showMethod={showMethod}
                    showHost={showHost}
                    showUrlPattern={showUrlPattern}
                    showHeaders={showHeaders}
                    onShowUrlPattern={() => setShowUrlPattern(true)}
                    onShowMethod={() => setShowMethod(true)}
                    onShowHost={() => setShowHost(true)}
                    onShowHeaders={() => {
                        setShowHeaders(true);
                        if (!value.headers) handleHeaderChange([{ key: '', value: '' }]);
                    }}
                />
            )}


        </Space>
    );
});
