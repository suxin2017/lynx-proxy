import React from 'react';
import { useSelectRequest } from '../store/selectRequestStore';
import Websocket from '../Websocket';

export const WebSocketContent: React.FC = () => {
  const { selectRequest } = useSelectRequest();

  return (
    <div className="h-full flex-1 overflow-auto">
      <Websocket websocketLog={selectRequest?.messages?.message} />
    </div>
  );
};
