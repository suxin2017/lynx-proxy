import { RequestContextMenu } from '@/components/RequestContextMenu';
import { MessageEventTimings } from '@/services/generated/utoipaAxum.schemas';
import { IViewMessageEventStoreValue } from '@/store';
import { useFilteredTableData } from '@/store/requestTableStore';
import type { TableProps } from 'antd';
import { Spin, Table } from 'antd';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import prettyMs from 'pretty-ms';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAutoScroll } from '../store/autoScrollStore';
import { useSelectRequest } from '../store/selectRequestStore';

dayjs.extend(duration);
dayjs.extend(relativeTime);

type ColumnsType<T extends object> = TableProps<T>['columns'];

export const RequestTable: React.FC<{ maxHeight: number }> = ({
  maxHeight,
}) => {
  const { t } = useTranslation();
  const requestTable = useFilteredTableData();
  const { selectRequest, setSelectRequest } = useSelectRequest();
  const tblRef: Parameters<typeof Table>[0]['ref'] = React.useRef(null);

  const { autoScroll } = useAutoScroll();

  const columns: ColumnsType<IViewMessageEventStoreValue> = [
    {
      title: '#',
      width: 50,
      dataIndex: 'traceId',
      align: 'center',
      ellipsis: true,
      render: (_traceId: string, _raw, index) => {
        return <span>{index}</span>;
      },
    },
    {
      title: t('network.table.status'),
      width: 100,
      dataIndex: ['response', 'status'],
      ellipsis: true,
      render: (status: number, raw) => {
        if (raw.request?.headers?.['connection'] === 'Upgrade') {
          return <span>101</span>;
        }
        if (raw.tunnel) {
          return <span>{raw.tunnel.status}</span>;
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
      width: 400,
      ellipsis: true,
      dataIndex: ['request', 'url'],
    },
    {
      title: t('network.table.schema'),
      width: 80,
      dataIndex: ['request', 'url'],
      ellipsis: true,
      render: (url: string, raw) => {
        if (raw.tunnel) {
          return <span>Tunnel</span>;
        }
        if (!url) {
          return '-';
        }
        try {
          const protocol = new URL(url).protocol;

          if (
            raw.request?.headers?.['connection'] === 'Upgrade' &&
            raw.request?.headers?.['upgrade'] === 'websocket' &&
            raw.request?.headers?.['sec-websocket-key'] !== undefined
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
      render: (type: string, raw) => {
        if (raw.request?.headers?.['connection'] === 'Upgrade') {
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
      key: 'time',
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
      width: 80,
      dataIndex: ['timings'],
      render: (timings: MessageEventTimings, raw) => {
        const { requestStart, requestEnd, tunnelEnd, tunnelStart } = timings;

        if (raw.tunnel && tunnelStart) {
          const formattedDuration = prettyMs(
            (tunnelEnd || Date.now()) - tunnelStart,
          );

          return <span>{formattedDuration}</span>;
        }
        if (requestStart) {
          const formattedDuration = prettyMs(
            (requestEnd || Date.now()) - requestStart,
          );
          return <span>{formattedDuration}</span>;
        }

        return <Spin size="small" />;
      },
    },
  ];
  console.log(maxHeight, 'maxHeight');
  useEffect(() => {
    console.log('requestTable', requestTable, autoScroll);
    if (autoScroll && requestTable.length > 0) {
      const lastItem = requestTable[requestTable.length - 1];
      console.log('autoScroll', lastItem, tblRef.current);
      if (lastItem && tblRef.current) {
        tblRef.current.scrollTo({
          key: lastItem.traceId,
        });
      }
    }
  }, [autoScroll, requestTable]);

  return (
    <RequestContextMenu>
      {({ handleContextMenu }) => (
        <div className="flex-1">
          <Table<IViewMessageEventStoreValue>
            ref={tblRef}
            style={{ height: maxHeight }}
            sticky
            className="flex-1"
            columns={columns}
            rowKey="traceId"
            size="small"
            rowClassName={(record) => {
              if (selectRequest?.traceId === record.traceId) {
                return 'cursor-pointer ant-table-row-selected';
              }
              return 'cursor-pointer';
            }}
            onRow={(record) => ({
              onClick: () => {
                setSelectRequest(record);
              },
              onContextMenu: (event) => handleContextMenu(record, event),
            })}
            virtual
            scroll={{ x: 800, y: maxHeight - 40 }}
            pagination={false}
            dataSource={requestTable}
          />
        </div>
      )}
    </RequestContextMenu>
  );
};
