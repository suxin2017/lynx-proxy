import { WebSocketLog } from '@/WebSocketLog';
import { RiArrowDownLine, RiArrowUpLine } from '@remixicon/react';
import { Table } from 'antd';
import React from 'react';

interface TextViewProps {
  websocketLog?: WebSocketLog[];
}

const Websocket: React.FC<TextViewProps> = ({ websocketLog }) => {
  if (!websocketLog) return null;

  return (
    <div className="flex h-full flex-col rounded-sm border-gray-300 p-1 font-mono text-xs">
      <Table
        size="small"
        columns={[
          {
            title: 'type',
            dataIndex: 'sendType',
            width: 20,
            render: (text) => {
              return text === 'ClientToServer' ? (
                <RiArrowUpLine className="text-green-700" size={14} />
              ) : (
                <RiArrowDownLine className="text-red-700" size={14} />
              );
            },
          },
          {
            title: 'data',
            dataIndex: 'data',
            render: (text) => atob(text),
          },
        ]}
        dataSource={websocketLog}
        pagination={false}
      />
    </div>
  );
};

export default Websocket;
