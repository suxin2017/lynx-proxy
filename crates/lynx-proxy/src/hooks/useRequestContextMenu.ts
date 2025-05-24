import { MenuProps, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { generateCurlCommand } from '@/utils/curlGenerator';
import { useState } from 'react';
import { IViewMessageEventStoreValue } from '@/store';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { useDebugMode } from './useDebugMode';

export interface UseRequestContextMenuOptions {
  onSelectRecord?: (record: IViewMessageEventStoreValue) => void;
}

export function useRequestContextMenu(options?: UseRequestContextMenuOptions) {
  const { t } = useTranslation();
  const [selectedRecord, setSelectedRecord] =
    useState<IViewMessageEventStoreValue | null>(null);

  const allRequests = useSelector(
    (state: RootState) => state.requestTable.requests,
  );

  // Check if debug mode is enabled via URL parameter (debug=true)
  const isDebugMode = useDebugMode();

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
    // Only show download options in debug mode (when URL has debug=true)
    ...(isDebugMode
      ? [
          {
            key: 'downloadAllRequests',
            label: t(
              'network.contextMenu.downloadAllRequests',
              'Download All Requests (Debug)',
            ),
            onClick: () => {
              const jsonData = JSON.stringify(allRequests, null, 2);
              const blob = new Blob([jsonData], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `all-requests-${new Date().toISOString()}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              message.success(
                t('common.downloadSuccess', 'Download successful'),
              );
            },
          },
          {
            key: 'copySelectedRequest',
            label: t(
              'network.contextMenu.copySelectedRequest',
              'Copy Selected Request (Debug)',
            ),
            onClick: () => {
              if (selectedRecord) {
                const jsonData = JSON.stringify(selectedRecord, null, 2);
                navigator.clipboard.writeText(jsonData).then(
                  () => message.success(t('common.copySuccess')),
                  () => message.error(t('common.copyFailed')),
                );
              }
            },
          },
        ]
      : []),
  ];

  return {
    selectedRecord,
    setSelectedRecord,
    handleContextMenu,
    contextMenuItems,
  };
}
