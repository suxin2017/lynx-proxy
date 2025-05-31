import { Button, Dropdown, Space } from 'antd';
import { PlusOutlined, DownOutlined } from '@ant-design/icons';
import React, { useMemo } from 'react';
import { useGetTemplateHandlers } from '@/services/generated/request-processing/request-processing';
import { HandlerRuleType } from '@/services/generated/utoipaAxum.schemas';

interface AddHandlerButtonProps {
    add: (defaultValue?: any) => void;
}

export const AddHandlerButton: React.FC<AddHandlerButtonProps> = ({ add }) => {
    const { data: templateHandlers } = useGetTemplateHandlers();


    const quickAddItems = [
        {
            key: 'block',
            type: 'block' as const,
            name: '阻止请求',
            config: { type: 'block', statusCode: 403, reason: '请求被阻止' }
        },
        {
            key: 'modifyRequest',
            type: 'modifyRequest' as const,
            name: '修改请求',
            config: { type: 'modifyRequest', modifyHeaders: null, modifyBody: null, modifyMethod: null, modifyUrl: null }
        },
        {
            key: 'modifyResponse',
            type: 'modifyResponse' as const,
            name: '修改响应',
            config: { type: 'modifyResponse', modifyHeaders: null, modifyBody: null, modifyMethod: null, modifyUrl: null }
        },
        {
            key: 'localFile',
            type: 'localFile' as const,
            name: '本地文件',
            config: { type: 'localFile', filePath: '', contentType: null, statusCode: null }
        }
    ];

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
                {quickAddItems.map(item => (
                    <Button
                        key={item.key}
                        onClick={() => add({
                            handlerType: item.config,
                            name: item.name,
                            enabled: true,
                            executionOrder: 0
                        })}
                    >
                        快速添加：{item.name}
                    </Button>
                ))}
            </div>
        </div>
    );
};
