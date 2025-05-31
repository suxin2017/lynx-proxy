import React from 'react';
import { HandlerRule, HandlerRuleType } from '@/services/generated/utoipaAxum.schemas';
import { BlockHandlerConfig } from './BlockHandlerConfig';
import { ModifyRequestConfig } from './ModifyRequestConfig';
import { ModifyResponseConfig } from './ModifyResponseConfig';
import { LocalFileConfig } from './LocalFileConfig';
import { ProxyForwardConfig } from './ProxyForwardConfig';

interface HandlerConfigProps {
    field: {
        key: number;
        name: number;
    };
    handler: HandlerRuleType;
}

export const HandlerConfig: React.FC<HandlerConfigProps> = ({ handler, field, }) => {
    // Type guard to safely access the type property
    const getHandlerType = (handlerType: any): string => {
        if (handlerType && typeof handlerType === 'object' && 'type' in handlerType) {
            return handlerType.type;
        }
        return 'unknown';
    };

    const handlerType = getHandlerType(handler);

    switch (handlerType) {
        case 'block':
            return <BlockHandlerConfig field={field} />;
        case 'modifyRequest':
            return <ModifyRequestConfig field={field} />;
        case 'modifyResponse':
            return <ModifyResponseConfig field={field} />;
        case 'localFile':
            return <LocalFileConfig field={field} />;
        case 'proxyForward':
            return <ProxyForwardConfig field={field} />;
        default:
            return (
                <div className="text-center text-gray-500 py-4">
                    不支持的处理器类型: {handlerType}
                </div>
            );
    }
};
