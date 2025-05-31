import { HandlerRule } from '@/services/generated/utoipaAxum.schemas';
import { CheckOutlined, CloseOutlined, DeleteOutlined, DragOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, InputNumber, Switch, Typography } from 'antd';
import React from 'react';
import { HandlerConfig } from './config';

const { Text } = Typography;

interface HandlerItemProps {
    field: {
        key: number;
        name: number;
    };
    index: number;
    isEditing: boolean;
    onEdit: () => void;
    onSave: () => void;
    onCancel: () => void;
    onDelete: () => void;
    isDragging?: boolean;
}

export const HandlerItem: React.FC<HandlerItemProps> = React.memo(({
    field,
    index,
    isEditing,
    onEdit,
    onSave,
    onCancel,
    onDelete,
}) => {
    const form = Form.useFormInstance();
    const handlerData: HandlerRule = Form.useWatch(['handlers', field.name], form);

    const getHandlerTypeDisplayName = (handlerType: any) => {
        if (!handlerType?.type) return '未知类型';

        const typeMap = {
            'block': '阻止请求',
            'modifyRequest': '修改请求',
            'modifyResponse': '修改响应',
            'localFile': '本地文件',
            'proxyForward': '代理转发'
        };

        return typeMap[handlerType.type as keyof typeof typeMap] || '未知类型';
    };

    const getHandlerDescription = (handlerType: any) => {
        if (!handlerType?.type) return '';

        const descMap = {
            'block': `状态码: ${handlerType.statusCode || 403}, 原因: ${handlerType.reason || 'Blocked'}`,
            'modifyRequest': '修改请求的头部、方法、URL或请求体',
            'modifyResponse': '修改响应的头部、状态码或响应体',
            'localFile': `文件路径: ${handlerType.filePath || '未设置'}`,
            'proxyForward': `代理地址: ${handlerType.proxyUrl || '未设置'}`
        };

        return descMap[handlerType.type as keyof typeof descMap] || '';
    };

    return (
        <Card
            size="small"
            className={`handler-item transition-all duration-200 `}
            title={
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                            <Text strong>{getHandlerTypeDisplayName(handlerData?.handlerType)}</Text>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Form.Item
                            name={[field.name, 'enabled']}
                            valuePropName="checked"
                            noStyle
                        >
                            <Switch size="small" />
                        </Form.Item>
                        {!isEditing ? (
                            <>
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<EditOutlined />}
                                    onClick={onEdit}
                                />
                                <Button
                                    type="text"
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={onDelete}
                                />
                            </>
                        ) : (
                            <>
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<CheckOutlined />}
                                    onClick={onSave}
                                />
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<CloseOutlined />}
                                    onClick={onCancel}
                                />
                            </>
                        )}
                    </div>
                </div>
            }
        >
            {!isEditing ? (
                <div className="space-y-2">
                    <div>
                        <Text strong>名称: </Text>
                        <Text>{handlerData?.name || '未命名处理器'}</Text>
                    </div>
                    {handlerData?.description && (
                        <div>
                            <Text strong>描述: </Text>
                            <Text type="secondary">{handlerData.description}</Text>
                        </div>
                    )}
                    <div>
                        <Text strong>配置: </Text>
                        <Text type="secondary">{getHandlerDescription(handlerData?.handlerType)}</Text>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* 处理器配置部分 */}
                    <HandlerConfig
                        field={field}
                        handler={handlerData.handlerType}
                    />
                </div>
            )}
        </Card>
    );
});
