import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { message } from 'antd';
import { RootState } from '@/store';
import { generateCurlCommand } from '@/utils/curlGenerator';
import { useDebugMode } from '@/hooks';
import { useRequestContextMenuContext } from './context';
import { MenuItemClickHandlers } from './types';
import {
  downloadJsonFile,
  copyToClipboard,
  generateTimestampFilename,
} from './utils';
import { useNavigate } from '@tanstack/react-router';
import { useApiDebug } from '@/routes/apiDebug/components/store';

export const useMenuItemHandlers = (): MenuItemClickHandlers => {
  const { selectedRecord } = useRequestContextMenuContext();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const allRequests = useSelector(
    (state: RootState) => state.requestTable.requests,
  );
  const { setFromRequest } = useApiDebug();

  const onCopyCurl = async () => {
    if (selectedRecord) {
      const curlCommand = generateCurlCommand(selectedRecord);
      const success = await copyToClipboard(curlCommand);
      if (success) {
        message.success(t('common.copySuccess'));
      } else {
        message.error(t('common.copyFailed'));
      }
    }
  };

  const onDownloadAllRequests = () => {
    const filename = generateTimestampFilename('all-requests');
    downloadJsonFile(allRequests, filename);
    message.success(t('common.downloadSuccess', 'Download successful'));
  };

  const onCopySelectedRequest = async () => {
    if (selectedRecord) {
      const success = await copyToClipboard(
        JSON.stringify(selectedRecord, null, 2),
      );
      if (success) {
        message.success(t('common.copySuccess'));
      } else {
        message.error(t('common.copyFailed'));
      }
    }
  };

  const onAddToApiDebug = () => {
    if (!selectedRecord) {
      message.error(t('contextMenu.noSelectedRecord'));
      return;
    }

    const request = selectedRecord.request;
    if (!request?.url) {
      message.error(t('contextMenu.noRequestData'));
      return;
    }

    try {
      // Use the new setFromRequest method instead of importCurl
      setFromRequest(selectedRecord);

      message.success(t('contextMenu.addToApiDebugSuccess'));
      navigate({ to: '/apiDebug' });
    } catch (error) {
      console.error('Failed to add request to API Debug:', error);
      message.error(t('contextMenu.addToApiDebugFailed'));
    }
  };

  return {
    onCopyCurl,
    onDownloadAllRequests,
    onCopySelectedRequest,
    onAddToApiDebug,
  };
};

export { useDebugMode, useRequestContextMenuContext };
