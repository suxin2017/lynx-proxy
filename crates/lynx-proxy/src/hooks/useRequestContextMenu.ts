import { MenuProps, message } from 'antd';
import { MessageEventStoreValue } from '@/services/generated/utoipaAxum.schemas';
import { useTranslation } from 'react-i18next';
import { generateCurlCommand } from '@/utils/curlGenerator';
import { useState } from 'react';

export interface UseRequestContextMenuOptions {
  onSelectRecord?: (record: MessageEventStoreValue) => void;
}

export function useRequestContextMenu(options?: UseRequestContextMenuOptions) {
  const { t } = useTranslation();
  const [selectedRecord, setSelectedRecord] =
    useState<MessageEventStoreValue | null>(null);

  const handleContextMenu = (
    record: MessageEventStoreValue,
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
