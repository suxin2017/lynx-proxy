import { useLocation, useNavigate } from '@tanstack/react-router';
import { Segmented } from 'antd';
import React from 'react';

const menuConfig = [
  {
    key: 'general',
    title: 'General Settings',
    path: '/settings/general',
  },
  {
    key: 'ssl-proxy',
    title: 'SSL Proxy',
    path: '/settings/ssl-proxy',
  },
  {
    key: 'certificates',
    title: 'Certificates',
    path: '/settings/certificates',
  },
];

export const SettingsMenu: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const currentMenu = menuConfig.find((item) =>
    pathname.includes(item.path),
  )?.title;

  return (
    <Segmented
      size="large"
      block
      value={currentMenu}
      className="w-full"
      onChange={(value) => {
        const selectedMenu = menuConfig.find((item) => item.title === value);
        if (selectedMenu) {
          navigate({ to: selectedMenu.path });
        }
      }}
      options={menuConfig.map((item) => item.title)}
    />
  );
};
