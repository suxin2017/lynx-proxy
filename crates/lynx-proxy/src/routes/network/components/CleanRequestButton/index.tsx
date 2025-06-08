import { clearRequestTable } from '@/store/requestTableStore';
import { clearRequestTree } from '@/store/requestTreeStore';
import { RiDeleteBin7Line } from '@remixicon/react';
import { Button } from 'antd';
import React from 'react';
import { useDispatch } from 'react-redux';
import { useSelectRequest } from '../store/selectRequestStore';
import { useTranslation } from 'react-i18next';

export const CleanRequestButton: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const { setSelectRequest } = useSelectRequest();

  return (
    <Button
      type="text"
      onClick={async () => {
        setSelectRequest(null);
        dispatch(clearRequestTree());
        dispatch(clearRequestTable());
      }}
      className="border-gray-300 dark:border-gray-500"
      icon={<RiDeleteBin7Line size={18} />}
    >
      {t('clearRequests')}
    </Button>
  );
};
