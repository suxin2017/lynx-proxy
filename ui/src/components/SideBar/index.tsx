import { RiEqualizer2Line, RiMedalLine, RiPlanetLine } from '@remixicon/react';
import { useNavigate } from '@tanstack/react-router';
import { Button, Layout, Space } from 'antd';
import React from 'react';

export const SideBar: React.FC = (_props) => {
  const navigate = useNavigate();

  return (
    <Layout.Sider theme="light" width={48} className="pt-4">
      <Space direction="vertical" className="w-full">
        <Button
          type="text"
          className="flex items-center justify-items-center w-full"
          onClick={() => {
            navigate({
              to: '/network',
            });
          }}
          icon={<RiPlanetLine size={20} />}
          title="Network"
        ></Button>
        <Button
          type="text"
          className="flex items-center justify-items-center w-full"
          onClick={() => {
            navigate({
              to: '/ruleManager',
            });
          }}
          icon={<RiEqualizer2Line size={20} />}
          title="Rule Config"
        />
        <Button
          type="text"
          className="flex items-center justify-items-center w-full"
          onClick={() => {
            navigate({
              to: '/certificates',
            });
          }}
          icon={<RiMedalLine size={20} />}
        />
      </Space>
    </Layout.Sider>
  );
};
