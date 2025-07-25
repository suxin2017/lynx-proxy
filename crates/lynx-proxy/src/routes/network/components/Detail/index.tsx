import { Empty, Segmented } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Overview } from '../Overview';
import { Contents } from '../Contents';
import { WebSocketContent } from '../WebSocketContent';
import { useSelectRequest } from '../store/selectRequestStore';

interface IDetailProps { }

export const Detail: React.FC<IDetailProps> = (_props) => {
  const { t } = useTranslation();
  const { isWebsocketRequest, selectRequest } = useSelectRequest();
  const [selectKey, setSelectKey] = React.useState<string>('1');

  if (!selectRequest) {
    return (
      <div className="flex flex-1 items-center justify-center">
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
    <div className="flex flex-1 flex-col w-full">
      <div className='w-10'>
        <Segmented options={initialItems.map(item => ({ label: item.label, value: item.key }))} onChange={(v) => {
          setSelectKey(v)
        }} />
      </div>
      <div className='flex-1 overflow-auto max-h-[calc(100vh-170px)]'>
        {selectKey === '1' && <Overview />}
        {selectKey === '2' && <Contents />}
        {selectKey === '3' && isWebsocketRequest && <WebSocketContent />}
      </div>
    </div>

  );
};
