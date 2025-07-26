import React from 'react';
import { Button, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTreeUI } from '../context/TreeContext';
import TreeSearch from './TreeSearch';

const TreeToolbar: React.FC = () => {
  const { showCreateFolderModal } = useTreeUI();

  return (
    <div className="px-4">
      <Space direction="vertical" className="w-full">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">API 集合</h3>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => showCreateFolderModal()}
          >
            新建文件夹
          </Button>
        </div>
        <TreeSearch />
      </Space>
    </div>
  );
};

export default TreeToolbar;