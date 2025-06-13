import { useState } from 'react';
import constate from 'constate';
import { IViewMessageEventStoreValue } from '@/store';
import { RequestContextMenuState } from './types';

export const [RequestContextMenuProvider, useRequestContextMenuContext] = constate(
  (): RequestContextMenuState => {
    const [selectedRecord, setSelectedRecord] =
      useState<IViewMessageEventStoreValue | null>(null);

    const handleContextMenu = (
      record: IViewMessageEventStoreValue,
      event: React.MouseEvent,
    ) => {
      event.preventDefault();
      setSelectedRecord(record);
    };

    return {
      selectedRecord,
      setSelectedRecord,
      handleContextMenu,
    };
  }
);
