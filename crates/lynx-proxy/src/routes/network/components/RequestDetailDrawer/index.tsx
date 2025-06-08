import { Drawer } from 'antd';
import constate from 'constate';
import React, { useState } from 'react';
import { Detail } from '../Detail';

export const [RequestDetailDrawerStateProvider, useRequestDetailDrawerState] =
  constate(() => {
    const [visible, setVisible] = useState(true);

    return {
      visible,
      setVisible,
    };
  });
export const RequestDetailDrawer: React.FC<{}> = () => {
  const { visible, setVisible } = useRequestDetailDrawerState();

  return (
    <div
      className="relative [&_.ant-drawer-content-wrapper]:shadow-inner"
      style={{ width: 560 }}
    >
      <Drawer
        autoFocus={false}
        open={visible}
        mask={false}
        getContainer={false}
        width={560}
        closeIcon={false}
        title={false}
        className="border-l-1 border-l-gray-200"
        style={{ position: 'absolute', boxShadow: 'none' }}
        onClose={() => setVisible(false)}
      >
        <Detail />
      </Drawer>
    </div>
  );
};
