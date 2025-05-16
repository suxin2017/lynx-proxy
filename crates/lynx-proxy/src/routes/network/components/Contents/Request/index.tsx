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

  const headers = selectRequest?.request?.headers;
  const contentType = !isWebsocketRequest
    ? get(headers, 'content-type', '')
    : 'websocket';

  const websocketBody = websocketResource.filter(
    (item) => item.sendType === 'ClientToServer',
  );
  return (
    <ContentPreviewTabs
      isLoading={
        selectRequest?.status !== 'Initial' &&
        selectRequest?.status !== 'RequestStarted'
      }
      title={'Request'}
      headers={headers}
      contentType={contentType}
      body={selectRequest?.request?.body as ArrayBuffer | undefined}
      websocketBody={websocketBody}
    />
  );
};
