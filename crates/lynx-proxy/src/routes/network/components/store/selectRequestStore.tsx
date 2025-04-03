import { Model } from '@/RequestModel';
import constate from 'constate';
import { useState } from 'react';

export const [UseSelectRequestProvider, useSelectRequest] = constate(() => {
  const [selectRequest, setSelectRequest] = useState<Model | null>(null);
  const [isWebsocketRequest, setIsWebsocketRequest] = useState(false);

  return {
    selectRequest,
    isWebsocketRequest,
    setSelectRequest: (request: Model) => {
      setSelectRequest(request);
      setIsWebsocketRequest(
        request.schema === 'ws' || request.schema === 'wss',
      );
    },
  };
});
