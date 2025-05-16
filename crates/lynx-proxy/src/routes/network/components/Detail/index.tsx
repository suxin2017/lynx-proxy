import { Empty, Tabs } from 'antd';
import React from 'react';
import { Overview } from '../Overview';
import { Contents } from '../Contents';
import { WebSocketContent } from '../WebSocketContent';
import { useSelectRequest } from '../store/selectRequestStore';

interface IDetailProps {}

export const Detail: React.FC<IDetailProps> = (_props) => {
  const { isWebsocketRequest, selectRequest } = useSelectRequest();
  if (!selectRequest) {
    return (
      <div className="flex h-full items-center justify-center">
        <Empty description={false} />
      </div>
    );
  }
  const initialItems = [
    { label: 'Overview', children: <Overview />, key: '1' },
    { label: 'Contents', children: <Contents />, key: '2' },
    isWebsocketRequest
      ? {
          label: 'Websocket',
          children: <WebSocketContent />,
          key: '3',
        }
      : undefined,
  ].filter((item) => !!item);
  return (
    <div className="h-full flex-1 px-2">
      <Tabs
        animated
        className="h-full flex-1 [&_.ant-tabs-content]:h-full [&_.ant-tabs-tabpane]:h-full"
        defaultActiveKey="1"
        tabBarStyle={{ margin: 0 }}
        items={initialItems}
      ></Tabs>
    </div>
  );
};
