import {
  RiEqualizer2Fill,
  RiMedalFill,
  RiMoonLine,
  RiPlanetFill,
  RiSettings2Fill,
  RiSunLine,
} from '@remixicon/react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { Button } from 'antd';
import React, { useEffect, useState } from 'react';

const topMenuConfig = [
  {
    key: '/network',
    title: 'Network',
    icon: <RiPlanetFill className="text-slate-600" size={24} />,
  },
  // {
  //   key: '/ruleManager',
  //   title: 'Rule Config',
  //   icon: <RiEqualizer2Fill className="text-slate-600" size={24} />,
  // },
  {
    key: '/certificates',
    title: 'Certificates',
    icon: <RiMedalFill className="text-slate-600" size={24} />,
  },
];
const bottomMenuConfig = [
  {
    key: '/settings',
    title: 'Settings',
    icon: <RiSettings2Fill className="text-slate-600" size={24} />,
  },
];

export const SideBar: React.FC = (_props) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'light';
    }
    return 'light';
  });

  // 使用 @tanstack/react-router 获取当前路径
  const currentPath = pathname;
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="flex w-14 flex-col justify-between shadow-xs shadow-slate-400">
      <div>
        {topMenuConfig.map((item) => (
          <Button
            key={item.key}
            type="text"
            className={`flex h-14 w-full items-center justify-items-center ${
              currentPath === item.key ? 'bg-zinc-200 dark:bg-zinc-800' : ''
            }`}
            onClick={() => {
              navigate({
                to: `/${item.key}`,
              });
            }}
            icon={item.icon}
            title={item.title}
          />
        ))}
      </div>
      <div>
        {bottomMenuConfig.map((item) => (
          <Button
            key={item.key}
            type="text"
            className={`flex h-14 w-full items-center justify-items-center ${
              currentPath === item.key ? 'bg-zinc-200 dark:bg-zinc-800' : ''
            }`}
            onClick={() => {
              navigate({
                to: `/${item.key}`,
              });
            }}
            icon={item.icon}
            title={item.title}
          />
        ))}
        <Button
          type="text"
          className="flex h-14 w-full items-center justify-items-center"
          onClick={toggleTheme}
          title="切换主题"
        >
          {theme === 'light' ? (
            <RiSunLine />
          ) : (
            <RiMoonLine className="text-slate-600" />
          )}
        </Button>
      </div>
    </div>
  );
};
