import { IViewMessageEventStoreValue } from '@/store/useSortPoll';
import constate from 'constate';
import { useState } from 'react';
import { useImmer } from 'use-immer';

export const [UseSelectRequestProvider, useSelectRequest] = constate(() => {
  const [selectRequest, setSelectRequest] =
    useState<IViewMessageEventStoreValue | null>(null);
  const [isWebsocketRequest, setIsWebsocketRequest] = useState(false);
  const [selectedRequest, setSelectedRequest] = useImmer<Record<string, boolean>>({});

  return {
    selectRequest,
    isWebsocketRequest,
    selectedRequest,
    setSelectRequest: (request: IViewMessageEventStoreValue | null) => {
      setIsWebsocketRequest(!!request?.messages?.message);
      setSelectRequest(request);
      setSelectedRequest(draft => { draft[request?.traceId || ''] = true });
    },
  };
});
