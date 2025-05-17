import {
  MessageEventStoreValue,
  MessageEventTimings,
} from '@/services/generated/utoipaAxum.schemas';
import { useFilteredTableData } from '@/store/requestTableStore';
import { useSize } from 'ahooks';
import type { TableProps } from 'antd';
import { Button, Spin, Table } from 'antd';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import prettyMs from 'pretty-ms';
import React, { useEffect, useRef, useState } from 'react';
import { useSelectRequest } from '../store/selectRequestStore';
import { TableFilter } from '../TableFilter';

dayjs.extend(duration);
dayjs.extend(relativeTime);

type ColumnsType<T extends object> = TableProps<T>['columns'];

const columns: ColumnsType<MessageEventStoreValue> = [
  {
    title: '#',
    width: 50,
    dataIndex: 'traceId',
    align: 'center',
    ellipsis: true,
  },
  {
    title: 'Status',
    width: 80,
    dataIndex: ['response', 'status'],
  },
  {
    title: 'Schema',
    width: 80,
    dataIndex: ['request', 'url'],
    render: (url: string, raw) => {
      if (!url) {
        return '-';
      }
      const protocol = new URL(url).protocol;

      if (
        raw.request?.headers['connection'] === 'Upgrade' &&
        raw.request?.headers['upgrade'] === 'websocket' &&
        raw.request?.headers['sec-websocket-key'] !== undefined
      ) {
        if (protocol === 'http:') {
          return <span>ws</span>;
        }
        if (protocol === 'https:') {
          return <span>wss</span>;
        }
      }

      return <span>{protocol}</span>;
    },
  },
  { title: 'Version', width: 80, dataIndex: ['request', 'version'] },
  {
    title: 'Method',
    width: 80,
    dataIndex: ['request', 'method'],
    key: 'method',
  },
  {
    title: 'Path',
    key: 'uri',
    dataIndex: ['request', 'url'],
    ellipsis: { showTitle: true },
  },
  {
    title: 'Path',
    key: 'uri',
    dataIndex: ['request', 'url'],
    ellipsis: { showTitle: true },
  },
  {
    title: 'type',
    key: 'type',
    dataIndex: ['response', 'headers', 'content-type'],
    render: (type: string, raw) => {
      if (raw.request?.headers['connection'] === 'Upgrade') {
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
    title: 'Time',
    key: 'time',
    dataIndex: ['timings'],
    render: (timings: MessageEventTimings) => {
      const { requestStart, requestEnd } = timings;

      if (!requestStart || !requestEnd) {
        return <Spin />;
      }
      const formattedDuration = prettyMs(requestEnd - requestStart);

      return <span>{formattedDuration}</span>;
    },
  },
];
export const RequestTable: React.FC = () => {
  const requestTable = useFilteredTableData();
  const { selectRequest, setSelectRequest } = useSelectRequest();
  console.log('requestTable', requestTable);
  const ref = useRef(null);
  const size = useSize(ref);
  const tblRef: Parameters<typeof Table>[0]['ref'] = React.useRef(null);

  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll) {
      tblRef.current?.scrollTo({
        key: requestTable[requestTable.length - 1]?.traceId,
      });
    }
  }, [autoScroll, requestTable]);

  return (
    <div
      className="bg-red relative flex h-full w-full flex-1 flex-col overflow-hidden"
      ref={ref}
    >
      <div className="flex-1">
        {!autoScroll && (
          <div className="absolute right-2 bottom-8 z-10">
            <Button
              size="small"
              onClick={() => {
                tblRef.current?.scrollTo({
                  index: requestTable.length - 1,
                });
                setAutoScroll(true);
              }}
            >
              Back to bottom
            </Button>
          </div>
        )}

        <Table<MessageEventStoreValue>
          ref={tblRef}
          sticky
          className="flex-1"
          columns={columns}
          rowKey="id"
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
          })}
          onScroll={(e) => {
            const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
            const isAtBottom = scrollHeight - scrollTop === clientHeight;
            if (!isAtBottom && autoScroll) {
              setAutoScroll(false);
            }
          }}
          virtual
          scroll={{ x: 800, y: size?.height ? size.height - 66 : 400 }}
          pagination={false}
          dataSource={requestTable}
        />
      </div>
      <TableFilter />
    </div>
  );
};
