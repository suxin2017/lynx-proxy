import { filterUri } from '@/store/requestTableStore';
import { Input } from 'antd';
import React from 'react';
import { useDispatch } from 'react-redux';

interface ISearchRequestUrlInputProps { }

export const SearchRequestUrlInput: React.FC<ISearchRequestUrlInputProps> = () => {
  const dispatch = useDispatch();

  return (
    <Input
      className="flex-1"
      allowClear
      placeholder="搜素请求..."
      onChange={(e) => {
        dispatch(filterUri(e.target.value));
      }}
    />
  );
};
