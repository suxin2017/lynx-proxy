import { useI18n } from '@/contexts';
import { MenuProps } from 'antd';
import { useDebugMode, useMenuItemHandlers } from './hooks';
import { useRuleMenuItems } from './useRuleMenuItems';
import { ItemType } from 'antd/es/menu/interface';

export const useDebugMenuItems = (): NonNullable<MenuProps['items']> => {
  const { t } = useI18n();
  const handlers = useMenuItemHandlers();
  return [
    {
      key: 'copyTraceId',
      label: "复制traceId",
      onClick: handlers.onCopyTraceId,
    },
    {
      key: 'downloadAllRequests',
      label: t('contextMenu.downloadAllRequests'),
      onClick: handlers.onDownloadAllRequests,
    },
    {
      key: 'copySelectedRequest',
      label: t('contextMenu.copySelectedRequest'),
      onClick: handlers.onCopySelectedRequest,
    },
  ];
};

export const useCpoyItems = (): NonNullable<ItemType> => {
  const { t } = useI18n();
  const handlers = useMenuItemHandlers();
  return {
    key: 'copy',
    label: '复制',
    // type: 'group',
    children: [
      {
        key: 'copyCurl',
        label: t('network.contextMenu.copyCurl'),
        onClick: handlers.onCopyCurl,
      },
      {
        key: 'copyUrl',
        label: t('network.contextMenu.copyUrl'),
        onClick: handlers.onCopyUrl,
      },
      {
        key: 'copyCookie',
        label: t('network.contextMenu.copyCookie'),
        onClick: handlers.onCopyCookie,
      },
      {
        key: 'copyReqHeader',
        label: t('network.contextMenu.copyReqHeader'),
        onClick: handlers.onCopyReqHeader,
      },
      {
        key: 'copyResHeader',
        label: t('network.contextMenu.copyResHeader'),
        onClick: handlers.onCopyResHeader,
      },
      {
        key: 'copyReqBody',
        label: t('network.contextMenu.copyReqBody'),
        onClick: handlers.onCopyReqBody,
      },
      {
        key: 'copyResBody',
        label: t('network.contextMenu.copyResBody'),
        onClick: handlers.onCopyResBody,
      },
    ],
  };
};

export const useContextMenuItems = () => {
  const { t } = useI18n();
  const handlers = useMenuItemHandlers();
  const debugMenuItems = useDebugMenuItems();
  const isDebugMode = useDebugMode();
  const ruleMenuItems = useRuleMenuItems();
  const copyItems = useCpoyItems();

  return [
    {
      key: 'addToApiDebug',
      label: t('contextMenu.addToApiDebug'),
      onClick: handlers.onAddToApiDebug,
    },
    copyItems,
    ruleMenuItems,
    ...(isDebugMode ? debugMenuItems : []),
  ];
};
