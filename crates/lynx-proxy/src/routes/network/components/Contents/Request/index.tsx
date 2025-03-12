import React from 'react';
import { useGetRequestBodyQuery } from '@/api/request';
import { get } from 'lodash';
import { ContentPreviewTabs } from '../ContentPreviewTabs';
import { useSelectRequest } from '../../store/selectRequestStore';

interface IContentsProps {}

export const Request: React.FC<IContentsProps> = (_props) => {
  const { selectRequest } = useSelectRequest();
  const { data, isLoading } = useGetRequestBodyQuery({
    id: selectRequest?.id,
  });

  const headers = get(selectRequest, 'header', {});
  const contentType = get(headers, 'Content-Type', '');
  return (
    <ContentPreviewTabs
      isLoading={isLoading}
      title={'Request'}
      headers={headers}
      contentType={contentType}
      body={data}
    />
  );
};
