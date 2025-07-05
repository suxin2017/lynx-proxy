import { Dropdown } from 'antd';
import { PropsWithChildren } from 'react';
import { useRequestContextMenuContext } from './hooks';
import { useContextMenuItems } from './menuItems';

// Re-export the context provider and hook for external use
export {
  RequestContextMenuProvider,
  useRequestContextMenuContext,
} from './context';
export type { RequestContextMenuState } from './types';

export const RequestContextMenu: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const { selectedRecord, setSelectedRecord } = useRequestContextMenuContext();

  const contextMenuItems = useContextMenuItems();

  return (
    <Dropdown
      menu={{ items: contextMenuItems }}
      trigger={['contextMenu']}
      open={!!selectedRecord}
      onOpenChange={(visible) => {
        if (!visible) {
          setSelectedRecord(null);
        }
      }}
    >
      {children}
    </Dropdown>
  );
};
