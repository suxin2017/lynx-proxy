import { Dropdown } from 'antd';
import { MessageEventStoreValue } from '@/services/generated/utoipaAxum.schemas';
import { useRequestContextMenu } from '@/hooks/useRequestContextMenu';

interface RequestContextMenuProps {
  children:
    | React.ReactNode
    | ((props: {
        handleContextMenu: (
          record: MessageEventStoreValue,
          event: React.MouseEvent,
        ) => void;
      }) => React.ReactNode);
  onSelectRecord?: (record: MessageEventStoreValue) => void;
}

export const RequestContextMenu: React.FC<RequestContextMenuProps> = ({
  children,
  onSelectRecord,
}) => {
  const {
    selectedRecord,
    setSelectedRecord,
    contextMenuItems,
    handleContextMenu,
  } = useRequestContextMenu({
    onSelectRecord,
  });

  return (
    <Dropdown
      menu={{ items: contextMenuItems }}
      open={!!selectedRecord}
      trigger={['contextMenu']}
      onOpenChange={(visible) => {
        if (!visible) {
          setSelectedRecord(null);
        }
      }}
    >
      {typeof children === 'function'
        ? children({ handleContextMenu })
        : children}
    </Dropdown>
  );
};
