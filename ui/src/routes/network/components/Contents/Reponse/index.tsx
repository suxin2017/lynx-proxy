import React from 'react';
import { Spin } from 'antd';
import { useSelectRequest } from '../../store/requestTableStore';
import { useGetResponseBodyQuery, useGetResponseQuery } from '@/api/request';
import { ContextTabs } from '../ContextTabs';
import { get } from 'lodash';

interface IContentsProps {}

export const Response: React.FC<IContentsProps> = (_props) => {
  const selectRequest = useSelectRequest();
  const { data: res, isLoading: responseDataLoading } =
    useGetResponseQuery({
      requestId: selectRequest?.id,
    });
  const { data: responseData } = res ?? {};
  const { data: body, isLoading: bodyDataLoading } = useGetResponseBodyQuery({
    uri: responseData?.uri,
    requestId: selectRequest?.id,
  });
  const headers = get(responseData, 'header', {});
  const contentType = get(headers, 'Content-Type', '');

  return (
    <Spin spinning={responseDataLoading || bodyDataLoading}>
      <ContextTabs
        title={'Request'}
        headers={headers}
        contentType={contentType}
        body={body}
      />
    </Spin>
  );
};
