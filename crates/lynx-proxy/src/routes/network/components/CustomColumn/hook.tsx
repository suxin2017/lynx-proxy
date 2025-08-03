import { MessageEventTimings } from '@/services/generated/utoipaAxum.schemas';
import { IViewMessageEventStoreValue } from '@/store/useSortPoll';
import { useLocalStorageState } from 'ahooks';
import { Popover, Typography } from 'antd';
import constate from 'constate';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getDurationTime } from '../RequestTable';
import AppIcon from '../RequestTable/utils/remixAppDetector';

dayjs.extend(duration);
dayjs.extend(relativeTime);

export const useColumns = () => {
    const { t } = useTranslation();
    const columns = useMemo(() => [
        {
            title: '#',
            width: 40,
            dataIndex: 'traceId',
            key: 'traceId',
            align: 'center',
            ellipsis: true,
            render: (_traceId: string, _raw: IViewMessageEventStoreValue, index: number) => {
                return <Typography.Text ellipsis>{index}</Typography.Text>;
            },
        },
        {
            title: t('network.table.app'),
            width: 50,
            key: 'app',
            align: 'center',
            ellipsis: true,
            render: (_value: unknown, raw: IViewMessageEventStoreValue) => {
                const headers = raw?.request?.headers || {};
                return <AppIcon headers={headers} size={16} />;
            },
        },
        {
            title: t('network.table.status'),
            width: 100,
            key: 'status',
            dataIndex: ['response', 'status'],
            ellipsis: true,
            render: (status: number, raw: IViewMessageEventStoreValue) => {
                if (raw?.request?.headers?.['connection'] === 'Upgrade') {
                    return <span>101</span>;
                }
                if (raw?.tunnel) {
                    return <span>{raw.tunnel?.status}</span>;
                }
                if (typeof raw?.status === "object" && raw.status.Error) {
                    if (raw.status.Error === 'Proxy request canceled') {
                        return <span className="text-gray-500">Canceled</span>;
                    }
                    return <Popover content={<pre className="overflow-auto max-h-40">
                        {raw.status.Error}
                    </pre>}>
                        <span className="text-red-500">Failed</span>
                    </Popover >
                }
                if (!status) {
                    return '-';
                }
                return <span>{status}</span>;
            },
        },
        {
            title: t('network.table.path'),
            key: 'uri',
            minWidth: 60,
            ellipsis: true,
            dataIndex: ['request', 'url'],
        },
        {
            title: t('network.table.schema'),
            width: 80,
            key: 'schema',
            dataIndex: ['request', 'url'],
            ellipsis: true,
            render: (url: string, raw: IViewMessageEventStoreValue) => {
                if (raw?.tunnel) {
                    return <span>Tunnel</span>;
                }
                if (!url) {
                    return '-';
                }
                try {
                    const protocol = new URL(url).protocol;

                    if (
                        raw?.request?.headers?.['connection'] === 'Upgrade' &&
                        raw?.request?.headers?.['upgrade'] === 'websocket' &&
                        raw?.request?.headers?.['sec-websocket-key'] !== undefined
                    ) {
                        if (protocol === 'http:') {
                            return <span>ws</span>;
                        }
                        if (protocol === 'https:') {
                            return <span>wss</span>;
                        }
                    }

                    return <span>{protocol}</span>;
                } catch (e) {
                    console.error(e);
                    return '-';
                }
            },
        },
        {
            title: t('network.table.version'),
            width: 80,
            ellipsis: true,
            key: 'version',
            dataIndex: ['request', 'version'],
        },
        {
            title: t('network.table.method'),
            width: 80,
            ellipsis: true,
            dataIndex: ['request', 'method'],
            key: 'method',
        },

        {
            title: t('network.table.type'),
            key: 'type',
            width: 200,
            ellipsis: true,
            dataIndex: ['response', 'headers', 'content-type'],
            render: (type: string, raw: IViewMessageEventStoreValue) => {
                if (raw?.request?.headers?.['connection'] === 'Upgrade') {
                    return <span>Upgrade</span>;
                }
                if (!type) {
                    return '-';
                }

                const contentType = type.split(';')[0];
                return <span>{contentType}</span>;
            },
        },
        {
            title: t('network.table.startTime'),
            key: 'startTime',
            width: 160,
            dataIndex: ['timings', 'requestStart'],
            render: (requestStart: number) => {
                if (!requestStart) {
                    return '-';
                }
                const formattedTime = dayjs(requestStart).format('YYYY-MM-DD HH:mm:ss');
                return <span>{formattedTime}</span>;
            },
        },

        {
            title: t('network.table.time'),
            key: 'time',
            width: 140,
            dataIndex: ['timings'],
            render: (timings: MessageEventTimings) => {
                return getDurationTime(timings);
            },
        },
    ] as {
        title: string;
        width?: number;
        minWidth?: number;
        dataIndex: string | string[];
        key: string;
        align?: 'left' | 'center' | 'right';
        ellipsis?: boolean;
        render?: (value: unknown, record: unknown, index: number) => React.ReactNode;
    }[], [t]);
    return columns
}

export const [CustomColumnProvider, useCustomColumnContext] = constate(
    () => {

        const columns = useColumns();
        const [columnsKey, setColumnsKey] = useLocalStorageState<string[]>("columnsKeys", {
            defaultValue: columns.map((column) => column.key),
        });

        const customColumns = useMemo(() => {
            return columns.filter((column) => columnsKey?.includes(column.key));
        }, [columns, columnsKey]);


        return {
            customColumns,
            columns,
            setColumnsKey,
        }
    },
);
