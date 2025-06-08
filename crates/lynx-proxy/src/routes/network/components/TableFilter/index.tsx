import { useI18n } from '@/contexts';
import { filterUri } from '@/store/requestTableStore';
import { Input } from 'antd';
import React from 'react';
import { useDispatch } from 'react-redux';

interface ISearchRequestUrlInputProps { }

export const SearchRequestUrlInput: React.FC<ISearchRequestUrlInputProps> = () => {
  const dispatch = useDispatch();
  const {t} = useI18n();


  return (
    <Input
      className="flex-1"
      allowClear
      placeholder={t('network.network.filterUriPlaceholder')}
      onChange={(e) => {
        dispatch(filterUri(e.target.value));
      }}
    />
  );
};
