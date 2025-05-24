import {
  WebSocketDirection,
  WebSocketLog,
  WebSocketMessage,
} from '@/services/generated/utoipaAxum.schemas';
import { RiArrowDownLine, RiArrowUpLine } from '@remixicon/react';
import { Table } from 'antd';
import React from 'react';

interface TextViewProps {
  websocketLog?: WebSocketLog[];
}

function base64ToString(base64: string): string {
  return decodeURIComponent(escape(window.atob(base64)));
}
const Websocket: React.FC<TextViewProps> = ({ websocketLog }) => {
  if (!websocketLog) return null;

  return (
    <div className="flex h-full flex-col rounded-sm border border-gray-300 bg-white p-1 font-mono text-xs text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
      <Table
        size="small"
        columns={[
          {
            title: 'type',
            dataIndex: 'direction',
            width: 20,
            render: (text: WebSocketDirection) => {
              return text === WebSocketDirection.ClientToServer ? (
                <RiArrowDownLine className="text-red-700" size={14} />
              ) : (
                <RiArrowUpLine className="text-green-700" size={14} />
              );
            },
          },
          {
            title: 'data',
            dataIndex: 'message',
            render: (msg: WebSocketMessage) => {
              if ('text' in msg && msg.text) {
                return <span>{base64ToString(msg.text)}</span>;
              }
              if ('binary' in msg && msg.binary) {
                return <span>{msg.binary}</span>;
              }
              if ('ping' in msg) {
                return <span>ping</span>;
              }
              if ('pong' in msg) {
                return <span>pong</span>;
              }
              if ('close' in msg) {
                return <span>close</span>;
              }
            },
          },
        ]}
        dataSource={websocketLog}
        pagination={false}
      />
    </div>
  );
};

export default Websocket;
