import { Card, Empty, Button, Typography, Tooltip } from 'antd';
import { FolderOutlined, PlusOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface CollectionPanelProps {
  className?: string;
}

export function CollectionPanel({ className }: CollectionPanelProps) {

  const handleCreateCollection = () => {
    // TODO: 实现创建集合功能
    console.log('Create collection');
  };

  return (
    <Card
      size="small"
      variant="borderless"
      className={className}
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOutlined />
            <span>集合</span>
          </div>
          <Tooltip title="创建集合">
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleCreateCollection}
              className="text-gray-400 hover:text-blue-500"
            />
          </Tooltip>
        </div>
      }
      styles={{
        body: {
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          padding: 0,
          overflow: 'auto'
        },
      }}
    >
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="暂无集合"
        className="py-8"
      >
        <Button type="primary" onClick={handleCreateCollection}>
          创建第一个集合
        </Button>
      </Empty>
    </Card>
  );
}