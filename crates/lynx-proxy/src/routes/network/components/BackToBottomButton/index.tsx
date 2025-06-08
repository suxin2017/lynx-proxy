import React from 'react';
import { Switch } from 'antd';
import { useTranslation } from 'react-i18next';
import { useAutoScroll } from '../store/autoScrollStore';

export const AutoScrollToBottom: React.FC = () => {
  const { t } = useTranslation();
  const { autoScroll, setAutoScroll } = useAutoScroll();

  return (
    <div className="flex items-center gap-1">
      <div className="">
        <Switch
          value={autoScroll}
          onChange={(val) => {
            setAutoScroll(val);
          }}
          title={t('network.toolbar.autoScroll')}
        />
      </div>
    </div>
  );
};
