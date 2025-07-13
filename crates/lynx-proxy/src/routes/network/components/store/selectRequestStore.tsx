import { IViewMessageEventStoreValue } from '@/store/useSortPoll';
import constate from 'constate';
import { useState } from 'react';

export const [UseSelectRequestProvider, useSelectRequest] = constate(() => {
  const [selectRequest, setSelectRequest] =
    useState<IViewMessageEventStoreValue | null>(null);
  const [isWebsocketRequest, setIsWebsocketRequest] = useState(false);

  return {
    selectRequest,
    isWebsocketRequest,
    setSelectRequest: (request: IViewMessageEventStoreValue | null) => {
      setIsWebsocketRequest(!!request?.messages?.message);
      setSelectRequest(request);
    },
  };
});
