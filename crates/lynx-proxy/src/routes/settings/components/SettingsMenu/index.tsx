import { useLocation, useNavigate } from '@tanstack/react-router';
import { Segmented } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

const menuConfig = [
  {
    key: 'general',
    translationKey: 'settings.menu.general',
    path: '/settings/general',
  },
  {
    key: 'network',
    translationKey: 'settings.menu.network',
    path: '/settings/network',
  },
  {
    key: 'certificates',
    translationKey: 'settings.menu.certificates',
    path: '/settings/certificates',
  },
];

export const SettingsMenu: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const currentMenu = menuConfig.find((item) =>
    pathname.includes(item.path),
  )?.translationKey;

  return (
    <Segmented
      size="large"
      block
      value={currentMenu ? t(currentMenu) : undefined}
      className="w-full"
      options={menuConfig.map((item) => t(item.translationKey))}
      onChange={(value) => {
        const selectedMenu = menuConfig.find(
          (item) => t(item.translationKey) === value,
        );
        if (selectedMenu) {
          navigate({ to: selectedMenu.path });
        }
      }}
    />
  );
};
