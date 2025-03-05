import { useClearRequestLog } from '@/api/request';
import { clearRequestTable } from '@/store/requestTableStore';
import { clearRequestTree } from '@/store/requestTreeStore';
import { RiBrush2Line } from '@remixicon/react';
import { Button } from 'antd';
import React from 'react';
import { useDispatch } from 'react-redux';

export const CleanRequestButton: React.FC = () => {
  const { mutateAsync: clearRequestLog, isPending } = useClearRequestLog();
  const dispatch = useDispatch();

  return (
    <Button
      type="text"
      loading={isPending}
      disabled={isPending}
      size="small"
      onClick={async () => {
        await clearRequestLog();
        dispatch(clearRequestTree())
        dispatch(clearRequestTable())
      }}
      icon={<RiBrush2Line size={16} className="text-yellow-700" />}
    >
      Clear
    </Button>
  );
};
