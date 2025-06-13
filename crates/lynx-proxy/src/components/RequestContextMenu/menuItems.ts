import { useI18n } from '@/contexts';
import { MenuProps } from 'antd';
import { useDebugMode, useMenuItemHandlers } from './hooks';
import { useRuleMenuItems } from './useRuleMenuItems';

export const useDebugMenuItems = (
): NonNullable<MenuProps['items']> => {
    const { t } = useI18n();
    const handlers = useMenuItemHandlers()
    return [
        {
            key: 'downloadAllRequests',
            label: t(
                'contextMenu.downloadAllRequests',
            ),
            onClick: handlers.onDownloadAllRequests,
        },
        {
            key: 'copySelectedRequest',
            label: t(
                'contextMenu.copySelectedRequest',
            ),
            onClick: handlers.onCopySelectedRequest,
        },
    ];
}

export const useContextMenuItems = (
) => {
    const { t } = useI18n();
    const handlers = useMenuItemHandlers()
    const debugMenuItems = useDebugMenuItems();
    const isDebugMode = useDebugMode();
    const ruleMenuItems = useRuleMenuItems();

    return [
        {
            key: 'copyCurl',
            label: t('network.contextMenu.copyCurl'),
            onClick: handlers.onCopyCurl,
        },
        ruleMenuItems,
        ...(isDebugMode ? debugMenuItems : []),
    ];
}
