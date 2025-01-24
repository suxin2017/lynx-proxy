import {
  ControlOutlined,
  FieldTimeOutlined,
  HomeOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { Button, Layout, Menu, Space } from 'antd';
import React from 'react';

export const SideBar: React.FC = (props) => {
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
            <FieldTimeOutlined
              style={{
                fontSize: '20px',
              }}
            />
          }
        ></Button>
        <Button
          type="text"
          className="flex items-center justify-items-center w-full"
          onClick={() => {
            navigate({
              to: '/about',
            });
          }}
          icon={
            <ControlOutlined
              style={{
                fontSize: '20px',
              }}
            />
          }
        />
        <Button
          type="text"
          className="flex items-center justify-items-center w-full"
          onClick={() => {
            navigate({
              to: '/setting',
            });
          }}
          icon={
            <SettingOutlined
              style={{
                fontSize: '20px',
              }}
            />
          }
        />
      </Space>
    </Layout.Sider>
  );
};
