import React from 'react';
import type { TreeNodeResponse } from '@/services/generated/utoipaAxum.schemas';
import { TreeUIProvider } from './context/TreeContext';
import TreeToolbar from './components/TreeToolbar';
import TreeView from './components/TreeView';
import TreeModals from './components/TreeModals';

interface TreeContainerProps {
  onNodeSelect?: (node: TreeNodeResponse) => void;
  selectedNodeId?: string;
}

const TreeContainer: React.FC<TreeContainerProps> = ({
  onNodeSelect,
  selectedNodeId,
}) => {
  return (
    <TreeUIProvider>
      <div className="h-full flex flex-col">
        <TreeToolbar />
        <TreeView 
          onNodeSelect={onNodeSelect} 
          selectedNodeId={selectedNodeId} 
        />
        <TreeModals />
      </div>
    </TreeUIProvider>
  );
};

export default TreeContainer;