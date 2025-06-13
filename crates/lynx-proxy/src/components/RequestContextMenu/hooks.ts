import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { message } from 'antd';
import { RootState } from '@/store';
import { generateCurlCommand } from '@/utils/curlGenerator';
import { useDebugMode } from '@/hooks';
import { useRequestContextMenuContext } from './context';
import { MenuItemClickHandlers } from './types';
import { downloadJsonFile, copyToClipboard, generateTimestampFilename } from './utils';

export const useMenuItemHandlers = (): MenuItemClickHandlers => {
  const { selectedRecord } = useRequestContextMenuContext();
  const { t } = useTranslation();
  const allRequests = useSelector(
    (state: RootState) => state.requestTable.requests,
  );

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
      const success = await copyToClipboard(JSON.stringify(selectedRecord, null, 2));
      if (success) {
        message.success(t('common.copySuccess'));
      } else {
        message.error(t('common.copyFailed'));
      }
    }
  };

  return {
    onCopyCurl,
    onDownloadAllRequests,
    onCopySelectedRequest,
  };
};

export { useDebugMode, useRequestContextMenuContext };
