import React, { useEffect } from 'react';
import { Table } from 'antd';
import type { TableProps } from 'antd';
import { fetchRequest } from '../../../../api/request';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { RequestModel } from '@/api/models';
import { RootState } from '../store';
import { useDispatch, useSelector } from 'react-redux';
import { appendRequest, handleSelect } from '../store/requestTableStore';

dayjs.extend(duration);

type ColumnsType<T extends object> = TableProps<T>['columns'];

const columns: ColumnsType<RequestModel> = [
  {
    title: 'Code',
    dataIndex: 'statusCode',
  },
  {
    title: 'Method',
    dataIndex: 'method',
    key: 'method',
  },
  {
    title: 'Path',
    key: 'uri',
    dataIndex: 'uri',
  },
];
export const RequestTable: React.FC = () => {
  const requestTable = useSelector(
    (state: RootState) => state.requestTable.requests,
  );
  const selectRow = useSelector(
    (state: RootState) => state.requestTable.selectRequest,
  );
  const dispatch = useDispatch();

  useEffect(() => {
    const controller = fetchRequest((data) => {
      dispatch(appendRequest(data.add));
    });
    return () => {
      controller.abort();
    };
  }, [dispatch]);
  return (
    <div className="flex-1 bg-white">
      <Table<RequestModel>
        columns={columns}
        size="small"
        rowClassName={(record) => {
          if (selectRow?.id === record.id) {
            return 'cursor-pointer ant-table-row-selected';
          }
          return 'cursor-pointer';
        }}
        onRow={(record) => ({
          onClick: () => {
            dispatch(handleSelect(record));
          },
        })}
        virtual
        scroll={{ y: '100vh' }}
        pagination={false}
        dataSource={requestTable}
      />
    </div>
  );
};
