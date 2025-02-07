import React, { useEffect, useRef, useState } from 'react';
import { Button, Table } from 'antd';
import type { TableProps } from 'antd';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { IRequestModel } from '@/api/models';
import { useSelector } from 'react-redux';
import { useSize } from 'ahooks';
import { useSelectRequest } from '../store/selectRequestStore';
import { RootState } from '@/store';

dayjs.extend(duration);

type ColumnsType<T extends object> = TableProps<T>['columns'];

const columns: ColumnsType<IRequestModel> = [
  {
    title: '#',
    width: 50,
    dataIndex: 'id',
    align: 'center',
  },
  {
    title: 'Code',
    width: 80,
    dataIndex: 'statusCode',
  },
  { title: 'Status', width: 80, dataIndex: 'statusCode' },
  { title: 'Schema', width: 80, dataIndex: 'schema' },
  { title: 'Version', width: 80, dataIndex: 'version' },
  {
    title: 'Method',
    width: 80,
    dataIndex: 'method',
    key: 'method',
  },
  {
    title: 'Path',
    key: 'uri',
    dataIndex: 'uri',
    ellipsis: { showTitle: true },
  },
];
export const RequestTable: React.FC = () => {
  const requestTable = useSelector(
    (state: RootState) => state.requestTable.requests,
  );
  const { selectRequest, setSelectRequest } = useSelectRequest();

  const ref = useRef(null);
  const size = useSize(ref);
  const tblRef: Parameters<typeof Table>[0]['ref'] = React.useRef(null);

  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll) {
      tblRef.current?.scrollTo({
        key: requestTable[requestTable.length - 1]?.id,
      });
    }
  }, [autoScroll, requestTable]);

  return (
    <div
      className="flex-1 bg-red flex flex-col relative h-full w-full overflow-hidden"
      ref={ref}
    >
      {!autoScroll && (
        <div className="absolute bottom-2 right-2 z-10">
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

      <Table<IRequestModel>
        ref={tblRef}
        sticky
        className="flex-1"
        columns={columns}
        rowKey="id"
        size="small"
        rowClassName={(record) => {
          if (selectRequest?.id === record.id) {
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
        scroll={{ x: 800, y: size?.height ?? 400 }}
        pagination={false}
        dataSource={requestTable}
      />
    </div>
  );
};
