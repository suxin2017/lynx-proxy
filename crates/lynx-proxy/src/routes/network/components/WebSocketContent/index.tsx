import React from 'react';
import { useSelectRequest } from '../store/selectRequestStore';
import Websocket from '../Websocket';

export const WebSocketContent: React.FC = () => {
  const { selectRequest } = useSelectRequest();

  return <Websocket websocketLog={selectRequest?.messages?.message} />;
};
