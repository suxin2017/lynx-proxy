import React, { useEffect } from 'react';
import { SSLProxySetting } from '../SSLProxySetting';
import { Divider, Menu, Spin } from 'antd';
import { GeneralSetting } from '../GeneralSetting';
import { Link } from '@tanstack/react-router';
import { useInViewport } from 'ahooks';
import { useGetAppConfig } from '@/api/app';

const menuConfig = [
  {
    key: 'General Settings',
    title: 'General Settings',
    component: <GeneralSetting />,
  },
  {
    key: 'ssl-proxy',
    title: 'SSL Proxy',
    component: <SSLProxySetting />,
  },
];

export const AppSetting: React.FC = () => {
  const [currentMenu, setCurrentMenu] = React.useState(menuConfig[0].key);
  const { isLoading } = useGetAppConfig();

  return (
    <div className="flex max-w-full flex-1">
      <Menu
        mode="vertical"
        selectedKeys={[currentMenu]}
        className="h-full w-64"
        items={menuConfig?.map((item) => {
          return {
            key: item.key,
            title: item.title,
            onClick: () => setCurrentMenu(item.key),
            label: (
              <Link to="/setting" hash={item.key} key={item.key}>
                {item.title}
              </Link>
            ),
          };
        })}
      />
      <div className="max-h-full flex-1">
        <Spin spinning={isLoading}>
          {menuConfig.map((item) => (
            <MenuItem
              setCurrentMenu={setCurrentMenu}
              component={item.component}
              key={item.key}
              value={item.key}
            />
          ))}
        </Spin>
      </div>
    </div>
  );
};

const MenuItem: React.FC<{
  component: React.ReactElement;
  value: string;
  setCurrentMenu: (key: string) => void;
}> = ({ component, value, setCurrentMenu }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const inViewPort = useInViewport(ref, {
    threshold: 1,
  });

  useEffect(() => {
    if (inViewPort[0]) {
      setCurrentMenu(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inViewPort]);
  return (
    <div id={value} ref={ref} className="min-h-52 w-[476px]">
      {component}
      <Divider />
    </div>
  );
};
