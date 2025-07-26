import { Splitter } from 'antd';
import { RequestHistory } from './RequestHistory';
import { CollectionPanel } from './CollectionPanel';
import { ApiDebugResponse } from '../../../services/generated/utoipaAxum.schemas';

interface SidebarProps {
  onLoadRequest: (request: ApiDebugResponse) => void;
  className?: string;
}

export function Sidebar({ onLoadRequest, className }: SidebarProps) {
  return (
    <div className={className}>
      <Splitter
        layout="vertical"
        style={{ height: '100%' }}

      >

        <Splitter.Panel collapsible defaultSize={'50%'} min={200}>
          <RequestHistory
            onLoadRequest={onLoadRequest}
            className="flex flex-1 flex-col"
          />
        </Splitter.Panel>
        <Splitter.Panel defaultSize={'50%'} min={200}>
          <CollectionPanel className="flex flex-1 flex-col" />
        </Splitter.Panel>
      </Splitter>
    </div>
  );
}