import { WebSocketDirection } from '@/services/generated/utoipaAxum.schemas';
import { get } from 'lodash';
import React from 'react';
import { useSelectRequest } from '../../store/selectRequestStore';
import { ContentPreviewTabs } from '../ContentPreviewTabs';

interface IContentsProps {}

export const Response: React.FC<IContentsProps> = (_props) => {
  const { selectRequest, isWebsocketRequest } = useSelectRequest();

  const responseData = selectRequest?.response;

  const headers = responseData?.headers;
  const contentType = !isWebsocketRequest
    ? get(headers, 'content-type', '')
    : 'websocket';

  const websocketBody = selectRequest?.messages?.message.filter(
    (item) => item.direction === WebSocketDirection.ServerToClient,
  );
  return (
    <ContentPreviewTabs
      title={'Response'}
      headers={headers}
      contentType={contentType}
      rawBody={responseData?.body}
      body={responseData?.bodyArrayBuffer}
      isLoading={
        selectRequest?.status !== 'Completed' &&
        selectRequest?.status !== 'Cancelled'
      }
      websocketBody={websocketBody}
    />
  );
};
