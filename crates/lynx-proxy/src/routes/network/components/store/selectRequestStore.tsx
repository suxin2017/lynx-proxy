import { Model } from '@/RequestModel';
import { MessageEventStoreValue } from '@/services/generated/utoipaAxum.schemas';
import constate from 'constate';
import { useState } from 'react';

export const [UseSelectRequestProvider, useSelectRequest] = constate(() => {
  const [selectRequest, setSelectRequest] =
    useState<MessageEventStoreValue | null>(null);
  const [isWebsocketRequest, setIsWebsocketRequest] = useState(false);

  return {
    selectRequest,
    isWebsocketRequest,
    setSelectRequest: (request: MessageEventStoreValue | null) => {
      setSelectRequest(request);
    },
  };
});
