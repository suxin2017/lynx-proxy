import React from 'react';
import TreeContainer from './TreeContainer';
import { TreeProvider } from './store/treeStore';

const CollectionPanel: React.FC = () => {
  return (
    <TreeProvider>
      <div className="h-full flex flex-col">
        <TreeContainer />
      </div>
    </TreeProvider>
  );
};

export default CollectionPanel;