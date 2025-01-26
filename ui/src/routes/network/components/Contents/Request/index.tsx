import React from 'react';
import { Empty, Spin } from 'antd';
import { useSelectRequest } from '../../store/requestTableStore';
import { useGetRequestBodyQuery } from '@/api/request';
import { get } from 'lodash';
import { ContextTabs } from '../ContextTabs';

interface IContentsProps {}

export const Request: React.FC<IContentsProps> = (_props) => {
  const selectRequest = useSelectRequest();
  const { data, isLoading } = useGetRequestBodyQuery({
    uri: selectRequest?.uri,
    id: selectRequest?.id,
  });

  const headers = get(selectRequest, 'header', {});
  const contentType = get(headers, 'Content-Type', '');

  if (!selectRequest) {
    return (
      <div className="h-full flex justify-center items-center">
        <Empty description={false} />
      </div>
    );
  }
  return (
    <Spin spinning={isLoading}>
      <ContextTabs
        title={'Request'}
        headers={headers}
        contentType={contentType}
        body={data}
      />
    </Spin>
  );
};
