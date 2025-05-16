import React, { useMemo } from 'react';
import { useGetResponseBodyQuery, useGetResponseQuery } from '@/api/request';
import { ContentPreviewTabs } from '../ContentPreviewTabs';
import { get } from 'lodash';
import { useSelectRequest } from '../../store/selectRequestStore';
import { useWebSocketResourceByTraceId } from '@/store/websocketResourceStore';

interface IContentsProps {}

export const Response: React.FC<IContentsProps> = (_props) => {
  const { selectRequest, isWebsocketRequest } = useSelectRequest();

  const websocketResource = useWebSocketResourceByTraceId(
    isWebsocketRequest ? selectRequest?.traceId : undefined,
  );

  const responseData = selectRequest?.response;

  const headers = responseData?.headers;
  const contentType = !isWebsocketRequest
    ? get(headers, 'content-type', '')
    : 'websocket';

  const websocketBody = websocketResource.filter(
    (item) => item.sendType === 'ServerToClient',
  );
  return (
    <ContentPreviewTabs
      title={'Response'}
      headers={headers}
      contentType={contentType}
      body={responseData?.body as ArrayBuffer | undefined}
      isLoading={
        selectRequest?.status !== 'Initial' &&
        selectRequest?.status !== 'RequestStarted'
      }
      websocketBody={websocketBody}
    />
  );
};
