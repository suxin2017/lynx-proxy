import React from 'react';
import { CollectionPanel as TreeCollectionPanel } from './CollectionTree';
import type { TreeNodeResponse } from '@/services/generated/utoipaAxum.schemas';

interface CollectionPanelProps {
  className?: string;
  onNodeSelect?: (node: TreeNodeResponse) => void;
  selectedNodeId?: string;
}

export function CollectionPanel({ className, onNodeSelect, selectedNodeId }: CollectionPanelProps) {
  return (
    <div className={className}>
      <TreeCollectionPanel
        onNodeSelect={onNodeSelect}
        selectedNodeId={selectedNodeId}
      />
    </div>
  );
}