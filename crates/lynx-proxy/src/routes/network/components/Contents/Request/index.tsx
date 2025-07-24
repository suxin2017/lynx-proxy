import { WebSocketDirection } from '@/services/generated/utoipaAxum.schemas';
import { get } from 'lodash';
import React from 'react';
import { useSelectRequest } from '../../store/selectRequestStore';
import { ContentPreviewTabs } from '../ContentPreviewTabs';

interface IContentsProps {}

export const Request: React.FC<IContentsProps> = (_props) => {
  const { selectRequest, isWebsocketRequest } = useSelectRequest();

  const headers = selectRequest?.request?.headers;
  const contentType = !isWebsocketRequest
    ? get(headers, 'content-type', '')
    : 'websocket';

  const websocketBody = selectRequest?.messages?.message.filter(
    (item) => item.direction === WebSocketDirection.ServerToClient,
  );

  return (
    <ContentPreviewTabs
      isLoading={
        selectRequest?.status !== 'Completed' &&
        selectRequest?.status !== 'Cancelled'
      }
      title={'Request'}
      headers={headers}
      contentType={contentType}
      rawBody={selectRequest?.request?.body}
      body={selectRequest?.request?.bodyArrayBuffer as ArrayBuffer | undefined}
      websocketBody={websocketBody}
    />
  );
};
