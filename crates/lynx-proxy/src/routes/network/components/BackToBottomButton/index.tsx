import React from 'react';
import { Switch } from 'antd';
import { useTranslation } from 'react-i18next';
import { useAutoScroll } from '../store/autoScrollStore';

export const AutoScrollToBottom: React.FC = () => {
  const { t } = useTranslation();
  const { setAutoScroll } = useAutoScroll();

  return (
    <div className="flex items-center gap-1">
      <div className="text-sm whitespace-pre">
        {t('network.toolbar.autoScrollLabel')}:
      </div>
      <div className="">
        <Switch
          size="small"
          onChange={(val) => {
            setAutoScroll(val);
          }}
          title={t('network.toolbar.autoScroll')}
        />
      </div>
    </div>
  );
};
