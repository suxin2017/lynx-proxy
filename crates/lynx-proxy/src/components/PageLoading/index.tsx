import { Spin } from 'antd';
import React from 'react';

export const PageLoading: React.FC = () => {
  return (
    <div className="flex h-max w-full items-center justify-center">
      <Spin />
    </div>
  );
};
