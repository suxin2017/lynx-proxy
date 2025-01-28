import {
  ControlOutlined,
  GlobalOutlined
} from '@ant-design/icons';
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
          icon={
            <GlobalOutlined
              style={{
                fontSize: '20px',
              }}
            />
          }
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
          icon={
            <ControlOutlined
              style={{
                fontSize: '20px',
              }}
            />
          }
          title="Rule Config"
        />
      </Space>
    </Layout.Sider>
  );
};
