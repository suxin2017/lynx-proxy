import { IViewMessageEventStoreValue } from '@/store';

export interface RequestContextMenuState {
  selectedRecord: IViewMessageEventStoreValue | null;
  setSelectedRecord: (record: IViewMessageEventStoreValue | null) => void;
  handleContextMenu: (
    record: IViewMessageEventStoreValue,
    event: React.MouseEvent,
  ) => void;
}
