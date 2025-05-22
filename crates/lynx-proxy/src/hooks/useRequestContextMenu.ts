import { MenuProps, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { generateCurlCommand } from '@/utils/curlGenerator';
import { useState } from 'react';
import { IViewMessageEventStoreValue } from '@/store';

export interface UseRequestContextMenuOptions {
  onSelectRecord?: (record: IViewMessageEventStoreValue) => void;
}

export function useRequestContextMenu(options?: UseRequestContextMenuOptions) {
  const { t } = useTranslation();
  const [selectedRecord, setSelectedRecord] =
    useState<IViewMessageEventStoreValue | null>(null);

  const handleContextMenu = (
    record: IViewMessageEventStoreValue,
    event: React.MouseEvent,
  ) => {
    event.preventDefault();
    setSelectedRecord(record);
    options?.onSelectRecord?.(record);
  };

  const contextMenuItems: MenuProps['items'] = [
    {
      key: 'copyCurl',
      label: t('network.contextMenu.copyCurl'),
      onClick: () => {
        if (selectedRecord) {
          const curlCommand = generateCurlCommand(selectedRecord);
          navigator.clipboard.writeText(curlCommand).then(
            () => message.success(t('common.copySuccess')),
            () => message.error(t('common.copyFailed')),
          );
        }
      },
    },
  ];

  return {
    selectedRecord,
    setSelectedRecord,
    handleContextMenu,
    contextMenuItems,
  };
}
