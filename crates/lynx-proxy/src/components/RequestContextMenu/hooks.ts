import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { message } from 'antd';
import { RootState } from '@/store';
import { generateCurlCommand } from '@/utils/curlGenerator';
import { useDebugMode } from '@/hooks';
import { useRequestContextMenuContext } from './context';
import {
  downloadJsonFile,
  copyToClipboard,
  generateTimestampFilename,
} from './utils';
import { useNavigate } from '@tanstack/react-router';
import { useApiDebug } from '@/routes/apiDebug/components/store';

export const useMenuItemHandlers = () => {
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
    onCopyUrl: () => {
      if (selectedRecord) {
        const url = selectedRecord.request?.url;
        if (url) {
          copyToClipboard(url).then((success) => {
            if (success) {
              message.success(t('common.copySuccess'));
            } else {
              message.error(t('common.copyFailed'));
            }
          });
        } else {
          message.error(t('contextMenu.noUrlToCopy'));
        }
      }
    },
    onCopyCookie: () => {
      if (selectedRecord) {
        const cookies = selectedRecord.request?.headers?.cookie;
        if (cookies) {
          copyToClipboard(cookies).then((success) => {
            if (success) {
              message.success(t('common.copySuccess'));
            } else {
              message.error(t('common.copyFailed'));
            }
          });
        } else {
          message.error(t('network.contextMenu.noCookieToCopy'));
        }
      }
    },
    onCopyReqHeader: () => {
      if (selectedRecord) {
        const headers = selectedRecord.request?.headers;
        if (headers) {
          copyToClipboard(JSON.stringify(headers, null, 2)).then((success) => {
            if (success) {
              message.success(t('common.copySuccess'));
            } else {
              message.error(t('common.copyFailed'));
            }
          });
        } else {
          message.error(t('network.contextMenu.noReqHeaderToCopy'));
        }
      }
    },
    onCopyResHeader: () => {
      if (selectedRecord) {
        const headers = selectedRecord.response?.headers;
        if (headers) {
          copyToClipboard(JSON.stringify(headers, null, 2)).then((success) => {
            if (success) {
              message.success(t('common.copySuccess'));
            } else {
              message.error(t('common.copyFailed'));
            }
          });
        } else {
          message.error(t('network.contextMenu.noResHeaderToCopy'));
        }
      }
    },
    onCopyReqBody: () => {
      if (selectedRecord) {
        const body = selectedRecord.request?.body;
        if (body) {
          const bodyContent =
            typeof body === 'string' ? body : JSON.stringify(body, null, 2);
          copyToClipboard(bodyContent).then((success) => {
            if (success) {
              message.success(t('common.copySuccess'));
            } else {
              message.error(t('common.copyFailed'));
            }
          });
        } else {
          message.error(t('network.contextMenu.noReqBodyToCopy'));
        }
      }
    },
    onCopyResBody: () => {
      if (selectedRecord) {
        const body = selectedRecord.response?.body;
        if (body) {
          const bodyContent =
            typeof body === 'string' ? body : JSON.stringify(body, null, 2);
          copyToClipboard(bodyContent).then((success) => {
            if (success) {
              message.success(t('common.copySuccess'));
            } else {
              message.error(t('common.copyFailed'));
            }
          });
        } else {
          message.error(t('network.contextMenu.noResBodyToCopy'));
        }
      }
    },
  };
};

export { useDebugMode, useRequestContextMenuContext };
