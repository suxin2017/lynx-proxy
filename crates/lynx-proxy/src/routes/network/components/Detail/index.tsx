import { Empty, Tabs } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Overview } from '../Overview';
import { Contents } from '../Contents';
import { WebSocketContent } from '../WebSocketContent';
import { useSelectRequest } from '../store/selectRequestStore';

interface IDetailProps {}

export const Detail: React.FC<IDetailProps> = (_props) => {
  const { t } = useTranslation();
  const { isWebsocketRequest, selectRequest } = useSelectRequest();

  if (!selectRequest) {
    return (
      <div className="flex h-full items-center justify-center">
        <Empty description={false} />
      </div>
    );
  }

  const initialItems = [
    { label: t('network.overview'), children: <Overview />, key: '1' },
    { label: t('network.contents'), children: <Contents />, key: '2' },
    isWebsocketRequest
      ? {
          label: t('network.websocket'),
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
