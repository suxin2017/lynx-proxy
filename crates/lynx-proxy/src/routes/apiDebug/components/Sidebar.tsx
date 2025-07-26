import { Splitter } from 'antd';
import { RequestHistory } from './RequestHistory';
import { CollectionPanel } from './CollectionPanel';
import { ApiDebugResponse, TreeNodeResponse } from '../../../services/generated/utoipaAxum.schemas';

interface SidebarProps {
  onLoadRequest: (request: ApiDebugResponse) => void;
  onNodeSelect?: (node: TreeNodeResponse) => void;
  selectedNodeId?: string;
  className?: string;
}

export function Sidebar({ onLoadRequest, onNodeSelect, selectedNodeId, className }: SidebarProps) {
  return (
    <div className={className}>
      <Splitter
        layout="vertical"
        style={{ height: '100%' }}

      >

        <Splitter.Panel collapsible defaultSize={'50%'} min={200} className='flex'>
          <RequestHistory
            onLoadRequest={onLoadRequest}
            className="flex flex-1 flex-col"
          />
        </Splitter.Panel>
        <Splitter.Panel defaultSize={'50%'} min={200} className='flex'>
          <CollectionPanel 
            className="flex flex-1 flex-col" 
            onNodeSelect={onNodeSelect}
            selectedNodeId={selectedNodeId}
          />
        </Splitter.Panel>
      </Splitter>
    </div>
  );
}