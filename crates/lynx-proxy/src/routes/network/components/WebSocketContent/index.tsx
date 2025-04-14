import { useWebSocketResourceByTraceId } from '@/store/websocketResourceStore';
import React from 'react';
import { useSelectRequest } from '../store/selectRequestStore';
import Websocket from '../Websocket';

export const WebSocketContent: React.FC = () => {
  const { selectRequest } = useSelectRequest();
  const websocketResource = useWebSocketResourceByTraceId(
    selectRequest?.traceId,
  );

  return <Websocket websocketLog={websocketResource} />;
};
