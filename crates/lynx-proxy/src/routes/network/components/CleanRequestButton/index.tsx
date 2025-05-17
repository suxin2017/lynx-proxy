import { clearRequestTable } from '@/store/requestTableStore';
import { clearRequestTree } from '@/store/requestTreeStore';
import { RiBrush2Line } from '@remixicon/react';
import { Button } from 'antd';
import React from 'react';
import { useDispatch } from 'react-redux';
import { useSelectRequest } from '../store/selectRequestStore';

export const CleanRequestButton: React.FC = () => {
  const dispatch = useDispatch();

  const { setSelectRequest } = useSelectRequest();

  return (
    <Button
      type="text"
      className="text-orange-500 hover:text-orange-600 dark:text-yellow-400 dark:hover:text-yellow-300"
      onClick={async () => {
        setSelectRequest(null);
        dispatch(clearRequestTree());
        dispatch(clearRequestTable());
      }}
      icon={<RiBrush2Line size={20} />}
      title="Clear all requests"
    />
  );
};
