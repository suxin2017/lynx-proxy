import { useCreateRule } from '@/services/generated/request-processing/request-processing';
import { useRequestContextMenuContext } from './context';
import { ItemType } from 'antd/es/menu/interface';
import { App } from 'antd'
import { useI18n } from '@/contexts';
const { useApp } = App;
export const useRuleMenuItems: () => NonNullable<ItemType> = () => {
    const { selectedRecord } = useRequestContextMenuContext();
    const app = useApp();
    const { t } = useI18n();

    const { mutateAsync } = useCreateRule({
        mutation: {
            onSuccess: () => {
                app.message.success(t('contextMenu.ruleCreateSuccess'));
            },
            onError: (_) => {
                app.message.error(t('contextMenu.ruleCreateFailed'));
            },
        }
    });
    return {
        key: 'rule',
        label: t('contextMenu.addToRule'),
        type: 'group',
        children: [
            {
                key: 'blockRule',
                label: t('contextMenu.blockRequest'),
                children: [
                    {
                        label: t('contextMenu.blockDomain'),
                        key: 'blockDomain',
                        onClick: () => {
                            if (!selectedRecord || !selectedRecord.request?.url) {
                                app.message.error(t('contextMenu.noSelectedRecord'));
                                return;
                            }
                            if (selectedRecord && selectedRecord.request.url) {
                                const hostname = new URL(selectedRecord.request.url).hostname;
                                mutateAsync({
                                    data: {
                                        name: t('contextMenu.blockDomainName', { hostname }),
                                        description: 'asdf',
                                        enabled: true,
                                        priority: 50,
                                        capture: {
                                            condition: {
                                                type: 'simple',
                                                urlPattern: null,
                                                method: null,
                                                host: hostname,
                                                headers: null,
                                            },
                                        },
                                        handlers: [
                                            {
                                                name: t('contextMenu.handlerNames.blockRequest'),
                                                description: null,
                                                enabled: true,
                                                executionOrder: 0,
                                                handlerType: {
                                                    type: 'block',
                                                    statusCode: 403,
                                                    reason: t('contextMenu.blockReason'),
                                                },
                                            },
                                        ],
                                    },
                                });
                            }
                        },
                    },
                    {
                        label: t('contextMenu.blockUrl'),
                        key: 'blockUrl',
                        onClick: () => {
                            if (!selectedRecord || !selectedRecord.response) {
                                app.message.error(t('contextMenu.noResponseData'));
                                return;
                            }
                            if (selectedRecord && selectedRecord.request.url) {
                                const url = new URL(selectedRecord.request.url).href;
                                mutateAsync({
                                    data: {
                                        name: t('contextMenu.blockUrlName', { url }),
                                        description: 'asdf',
                                        enabled: true,
                                        priority: 50,
                                        capture: {
                                            condition: {
                                                type: 'simple',
                                                urlPattern: {
                                                    captureType: 'exact',
                                                    pattern: url,
                                                },
                                                method: null,
                                                host: null,
                                                headers: null,
                                            },
                                        },
                                        handlers: [
                                            {
                                                name: t('contextMenu.handlerNames.blockRequest'),
                                                description: null,
                                                enabled: true,
                                                executionOrder: 0,
                                                handlerType: {
                                                    type: 'block',
                                                    statusCode: 403,
                                                    reason: t('contextMenu.blockReason'),
                                                },
                                            },
                                        ],
                                    },
                                });
                            }
                        },
                    },
                ],
            },
            {
                key: 'overrideRule',
                label: t('contextMenu.overrideResponse'),
                children: [
                    {
                        label: t('contextMenu.overrideHeaders'),
                        key: 'overrideHeaders',
                        onClick: () => {
                            if (!selectedRecord || !selectedRecord.response) {
                                app.message.error(t('contextMenu.noResponseData'));
                                return;
                            }
                            if (selectedRecord && selectedRecord.request.url) {
                                const url = new URL(selectedRecord.request.url).href;
                                mutateAsync({
                                    data: {
                                        name: t('contextMenu.overrideHeadersName', { url }),
                                        description: null,
                                        enabled: true,
                                        priority: 50,
                                        capture: {
                                            condition: {
                                                type: 'simple',
                                                urlPattern: {
                                                    captureType: 'exact',
                                                    pattern: url,
                                                },
                                                method: null,
                                                host: null,
                                                headers: null,
                                            },
                                        },
                                        handlers: [
                                            {
                                                name: t('contextMenu.handlerNames.modifyResponse'),
                                                description: null,
                                                enabled: true,
                                                executionOrder: 0,
                                                handlerType: {
                                                    type: 'modifyResponse',
                                                    modifyHeaders: selectedRecord.response.headers,
                                                    modifyBody: null,
                                                    modifyMethod: null,
                                                },
                                            },
                                        ],
                                    },
                                });
                            }
                        },
                    },
                    {
                        label: t('contextMenu.overrideBody'),
                        key: 'overrideBody',
                        onClick: () => {
                            console.log(selectedRecord?.response.bodyArrayBuffer)
                            if (selectedRecord && selectedRecord.request.url) {
                                const url = new URL(selectedRecord.request.url).href;
                                mutateAsync({
                                    data: {
                                        name: t('contextMenu.overrideBodyName', { url }),
                                        description: null,
                                        enabled: true,
                                        priority: 50,
                                        capture: {
                                            condition: {
                                                type: 'simple',
                                                urlPattern: {
                                                    captureType: 'exact',
                                                    pattern: url,
                                                },
                                                method: null,
                                                host: null,
                                                headers: null,
                                            },
                                        },
                                        handlers: [
                                            {
                                                name: t('contextMenu.handlerNames.modifyResponse'),
                                                description: null,
                                                enabled: true,
                                                executionOrder: 0,
                                                handlerType: {
                                                    type: 'modifyResponse',
                                                    modifyHeaders: null,
                                                    modifyBody: new TextDecoder().decode(selectedRecord.response.bodyArrayBuffer), // 假设 response.body 是字符串
                                                    modifyMethod: null,
                                                },
                                            },
                                        ],
                                    },
                                });
                            }
                        },
                    },
                    {
                        label: t('contextMenu.overrideFullResponse'),
                        key: 'overrideResponse',
                        onClick: () => {
                            if (selectedRecord && selectedRecord.request.url) {
                                const url = new URL(selectedRecord.request.url).href;
                                mutateAsync({
                                    data: {
                                        name: t('contextMenu.overrideResponseName', { url }),
                                        description: null,
                                        enabled: true,
                                        priority: 50,
                                        capture: {
                                            condition: {
                                                type: 'simple',
                                                urlPattern: {
                                                    captureType: 'exact',
                                                    pattern: url,
                                                },
                                                method: null,
                                                host: null,
                                                headers: null,
                                            },
                                        },
                                        handlers: [
                                            {
                                                name: t('contextMenu.handlerNames.modifyResponse'),
                                                description: null,
                                                enabled: true,
                                                executionOrder: 0,
                                                handlerType: {
                                                    type: 'modifyResponse',
                                                    modifyHeaders: selectedRecord.response.headers,
                                                    modifyBody: new TextDecoder().decode(selectedRecord.response.bodyArrayBuffer), // 假设 response.body 是字符串
                                                    modifyMethod: null,
                                                },
                                            },
                                        ],
                                    },
                                });
                            }
                        },
                    },
                ],
            },
        ],
    };
};
