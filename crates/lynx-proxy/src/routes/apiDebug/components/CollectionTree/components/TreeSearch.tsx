import React from 'react';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useTreeUI } from '../context/TreeContext';

const TreeSearch: React.FC = () => {
  const { searchValue, setSearchValue } = useTreeUI();

  return (
    <Input
      placeholder="搜索 API..."
      value={searchValue}
      onChange={(e) => setSearchValue(e.target.value)}
      prefix={<SearchOutlined />}
      allowClear
    />
  );
};

export default TreeSearch;