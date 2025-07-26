import React from 'react';
import { Button, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTreeUI } from '../context/TreeContext';
import TreeSearch from './TreeSearch';

const TreeToolbar: React.FC = () => {
  const { showCreateFolderModal } = useTreeUI();

  return (
    <div className="p-4">
      <Space direction="vertical" className="w-full">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">集合</span>
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => showCreateFolderModal()}
          >
            新建
          </Button>
        </div>
        <TreeSearch />
      </Space>
    </div>
  );
};

export default TreeToolbar;