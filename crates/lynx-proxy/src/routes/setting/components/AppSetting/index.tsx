import React from 'react';
import { SSLProxySetting } from '../SSLProxySetting';
import { Menu } from 'antd';

const menuConfig = [
  {
    key: 'ssl-proxy',
    title: 'SSL Proxy',
    component: <SSLProxySetting />,
  },
];

export const AppSetting: React.FC = () => {
  const [currentMenu, setCurrentMenu] = React.useState(menuConfig[0].key);
  return (
    <div className="flex flex-1 space-x-2">
      <Menu
        mode="vertical"
        selectedKeys={[currentMenu]}
        className="h-full w-64"
      >
        {menuConfig.map((item) => (
          <Menu.Item key={item.key} onClick={() => setCurrentMenu(item.key)}>
            {item.title}
          </Menu.Item>
        ))}
      </Menu>
      <div className='flex-1'>
        {menuConfig.find((item) => item.key === currentMenu)?.component}
      </div>
    </div>
  );
};
