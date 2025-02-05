import React from 'react';
import { useGetResponseBodyQuery, useGetResponseQuery } from '@/api/request';
import { ContextTabs } from '../ContextTabs';
import { get } from 'lodash';
import { useSelectRequest } from '../../store/selectRequestStore';

interface IContentsProps {}

export const Response: React.FC<IContentsProps> = (_props) => {
  const selectRequest = useSelectRequest();
  const { data: res, isLoading: responseDataLoading } = useGetResponseQuery({
    requestId: selectRequest?.id,
  });
  const { data: responseData } = res ?? {};
  const { data: body, isLoading: bodyDataLoading } = useGetResponseBodyQuery({
    requestId: selectRequest?.id,
  });

  const headers = get(responseData, 'header', {});
  const contentType = get(headers, 'Content-Type', '');

  return (
    <ContextTabs
      title={'Response'}
      headers={headers}
      contentType={contentType}
      body={body}
      isLoading={bodyDataLoading || responseDataLoading}
    />
  );
};
