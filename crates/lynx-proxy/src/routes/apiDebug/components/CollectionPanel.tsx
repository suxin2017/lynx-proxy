import { CollectionPanel as TreeCollectionPanel } from './CollectionTree';

interface CollectionPanelProps {
  className?: string;
}

export function CollectionPanel({ className }: CollectionPanelProps) {
  return (
    <div className={className}>
      <TreeCollectionPanel />
    </div>
  );
}