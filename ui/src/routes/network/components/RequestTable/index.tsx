import React, { useEffect } from 'react';
import { Button, Table } from 'antd';
import type { TableProps } from 'antd';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { fetchRequest } from '../../../../api/request';
import { RequestLog } from '../store';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import prettyBytes from 'pretty-bytes';
import prettyTime from 'pretty-time';

dayjs.extend(duration);

type ColumnsType<T extends object> = TableProps<T>['columns'];

const columns: ColumnsType<RequestLog> = [
  {
    title: 'Code',
    dataIndex: 'code',
    key: 'code',
  },
  {
    title: 'Method',
    dataIndex: 'method',
    key: 'method',
  },
  {
    title: 'Host',
    dataIndex: 'host',
    key: 'host',
  },
  {
    title: 'Path',
    key: 'uri',
    dataIndex: 'uri',
  },
  {
    title: 'Start',
    dataIndex: 'start',
    shouldCellUpdate: (record, prevRecord) => {
      return record.start !== prevRecord.start;
    },
    render: (text) => {
      return dayjs(text).format('YYYY-MM-DD HH:mm:ss.SSS');
    },
  },
  {
    title: 'End',
    dataIndex: 'end',
    render: (text) => {
      return dayjs(text).format('YYYY-MM-DD HH:mm:ss.SSS');
    },
  },
  {
    title: 'Duration',
    dataIndex: 'end',
    shouldCellUpdate: (record, prevRecord) => {
      return record.start !== prevRecord.start || record.end !== prevRecord.end;
    },
    render: (_text, record) => {
      return prettyTime(record.end - record.start, 'ms');
    },
  },
  {
    title: 'Size',
    dataIndex: 'size',
    render: (text) => {
      return text ? prettyBytes(text) : '-';
    },
  },
];
export const useStore = create<{
  data: RequestLog[];
  select: RequestLog | null;
  handleSelect: (record: RequestLog) => void;
  add: (record: RequestLog) => void;
}>()(
  immer((set) => ({
    data: [],
    select: null,
    handleSelect: (record: RequestLog) => {
      set((state) => {
        if (state.select?.traceId === record.traceId) {
          state.select = null;
          return;
        }
        state.select = record;
      });
    },
    add: (data: RequestLog) => {
      set((state) => {
        state.data.push(data);
      });
    },
  })),
);

export const RequestTable: React.FC = () => {
  // const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const { add, data, select, handleSelect } = useStore();
  // useEffect(() => {
  //   let timer = setInterval(() => {
  //     add();
  //   }, 1000);
  //   return () => {
  //     clearInterval(timer);
  //   };
  // }, []);
  // useEffect(() => {
  //   const controller = fetchRequest((data) => {
  //     // add(data.)
  //     add(data.add);
  //     console.log(data);
  //   });
  //   return () => {
  //     controller.abort();
  //   };
  // }, [add]);
  return (
    <div className="flex-1 bg-white">
      <Button onClick={() => {}}>change randomw</Button>
      <Table<RequestLog>
        columns={columns}
        size="small"
        rowClassName={(record) => {
          if (select?.traceId === record.traceId) {
            return 'cursor-pointer ant-table-row-selected';
          }
          return 'cursor-pointer';
        }}
        onRow={(record) => ({
          onClick: () => {
            handleSelect(record);
            console.log(record);
          },
        })}
        virtual
        scroll={{ y: '100vh' }}
        pagination={false}
        dataSource={data}
        
      />
    </div>
  );
};
