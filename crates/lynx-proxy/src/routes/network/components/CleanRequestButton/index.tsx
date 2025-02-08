import { useClearRequestLog } from '@/api/request';
import { RiBrush2Line } from '@remixicon/react';
import { Button, message } from 'antd';
import React from 'react';

export const CleanRequestButton: React.FC = () => {
  const { mutateAsync: clearRequestLog, isPending } = useClearRequestLog();

  return (
    <Button
      type="text"
      loading={isPending}
      disabled={isPending}
      size="small"
      onClick={async () => {
        await clearRequestLog();
        message.success('Request log cleared');
      }}
      icon={<RiBrush2Line size={16} className="text-yellow-700" />}
    >
      Clear
    </Button>
  );
};
