import { Dropdown } from 'antd';
import { useRequestContextMenu } from '@/hooks/useRequestContextMenu';
import { IViewMessageEventStoreValue } from '@/store';

interface RequestContextMenuProps {
  children:
    | React.ReactNode
    | ((props: {
        handleContextMenu: (
          record: IViewMessageEventStoreValue,
          event: React.MouseEvent,
        ) => void;
      }) => React.ReactNode);
  onSelectRecord?: (record: IViewMessageEventStoreValue) => void;
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
