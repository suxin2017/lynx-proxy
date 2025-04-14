import React from 'react';
import { useGetRequestBodyQuery } from '@/api/request';
import { get } from 'lodash';
import { ContentPreviewTabs } from '../ContentPreviewTabs';
import { useSelectRequest } from '../../store/selectRequestStore';
import { useWebSocketResourceByTraceId } from '@/store/websocketResourceStore';

interface IContentsProps {}

export const Request: React.FC<IContentsProps> = (_props) => {
  const { selectRequest, isWebsocketRequest } = useSelectRequest();
  const websocketResource = useWebSocketResourceByTraceId(
    isWebsocketRequest ? selectRequest?.traceId : undefined,
  );

  const { data, isLoading } = useGetRequestBodyQuery({
    id: isWebsocketRequest ? undefined : selectRequest?.id,
  });

  const headers = get(selectRequest, 'header', {} as Record<string, string>);
  const contentType = !isWebsocketRequest
    ? get(headers, 'Content-Type', '')
    : 'websocket';

  const websocketBody = websocketResource.filter(
    (item) => item.sendType === 'ClientToServer',
  );
  return (
    <ContentPreviewTabs
      isLoading={isLoading}
      title={'Request'}
      headers={headers}
      contentType={contentType}
      body={data}
      websocketBody={websocketBody}
    />
  );
};
