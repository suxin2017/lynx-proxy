import React from 'react';
import { Card } from 'antd';
import TreeContainer from './TreeContainer';
import { TreeProvider } from './store/treeStore';
import type { TreeNodeResponse } from '@/services/generated/utoipaAxum.schemas';

interface CollectionPanelProps {
  onNodeSelect?: (node: TreeNodeResponse) => void;
  selectedNodeId?: string;
}

const CollectionPanel: React.FC<CollectionPanelProps> = ({
  onNodeSelect,
  selectedNodeId,
}) => {
  return (
    <TreeProvider>
      <div className="h-full flex flex-col">
        <TreeContainer
          onNodeSelect={onNodeSelect}
          selectedNodeId={selectedNodeId}
        />
      </div>
    </TreeProvider>
  );
};

export default CollectionPanel;