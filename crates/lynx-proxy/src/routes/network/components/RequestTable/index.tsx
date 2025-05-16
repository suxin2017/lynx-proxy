import React, { useEffect, useRef, useState } from 'react';
import { Button, Spin, Table } from 'antd';
import type { TableProps } from 'antd';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import { IRequestModel } from '@/api/models';
import { useSize } from 'ahooks';
import { useSelectRequest } from '../store/selectRequestStore';
import { TableFilter } from '../TableFilter';
import { useFilteredTableData } from '@/store/requestTableStore';
import {
  MessageEventStoreValue,
  MessageEventTimings,
} from '@/services/generated/utoipaAxum.schemas';
import prettyMs from 'pretty-ms';

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
    render: (url: string) => {
      const protocol = new URL(url).protocol;
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
