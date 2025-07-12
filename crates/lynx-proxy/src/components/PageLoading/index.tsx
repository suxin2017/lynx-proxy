import { Spin } from 'antd';
import React from 'react';

export const PageLoading: React.FC = () => {
  return (
    <div className="flex h-max  items-center justify-center">
      <Spin />
    </div>
  );
};
