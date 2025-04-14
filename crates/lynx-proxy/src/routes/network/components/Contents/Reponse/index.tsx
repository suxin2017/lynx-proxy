import React from 'react';
import { useGetResponseBodyQuery, useGetResponseQuery } from '@/api/request';
import { ContentPreviewTabs } from '../ContentPreviewTabs';
import { get } from 'lodash';
import { useSelectRequest } from '../../store/selectRequestStore';
import { useWebSocketResourceByTraceId } from '@/store/websocketResourceStore';

interface IContentsProps {}

export const Response: React.FC<IContentsProps> = (_props) => {
  const { selectRequest, isWebsocketRequest } = useSelectRequest();
  const { data: res, isLoading: responseDataLoading } = useGetResponseQuery({
    requestId: selectRequest?.id,
  });
  const websocketResource = useWebSocketResourceByTraceId(
    isWebsocketRequest ? selectRequest?.traceId : undefined,
  );

  const { data: responseData } = res ?? {};
  const { data: body, isLoading: bodyDataLoading } = useGetResponseBodyQuery({
    requestId: isWebsocketRequest ? undefined : selectRequest?.id,
  });

  const headers = get(responseData, 'header', {} as Record<string, string>);
  const contentType = !isWebsocketRequest
    ? get(headers, 'Content-Type', '')
    : 'websocket';

  const websocketBody = websocketResource.filter(
    (item) => item.sendType === 'ServerToClient',
  );
  return (
    <ContentPreviewTabs
      title={'Response'}
      headers={headers}
      contentType={contentType}
      body={body}
      isLoading={bodyDataLoading || responseDataLoading}
      websocketBody={websocketBody}
    />
  );
};
