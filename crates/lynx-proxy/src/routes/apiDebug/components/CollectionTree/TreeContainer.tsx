import React from 'react';
import { TreeUIProvider } from './context/TreeContext';
import TreeToolbar from './components/TreeToolbar';
import TreeView from './components/TreeView';
import TreeModals from './components/TreeModals';

const TreeContainer: React.FC = () => {
  return (
    <TreeUIProvider>
      <div className="h-full flex flex-col">
        <TreeToolbar />
        <TreeView />
        <TreeModals />
      </div>
    </TreeUIProvider>
  );
};

export default TreeContainer;