import {
  RiEqualizer2Fill,
  RiMedalFill,
  RiPlanetFill,
  RiSettings2Fill,
} from '@remixicon/react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from 'antd';
import React from 'react';

const topMenuConfig = [
  {
    key: 'network',
    title: 'Network',
    icon: <RiPlanetFill className="text-slate-600" size={24} />,
  },
  {
    key: 'ruleManager',
    title: 'Rule Config',
    icon: <RiEqualizer2Fill className="text-slate-600" size={24} />,
  },
  {
    key: 'certificates',
    title: 'Certificates',
    icon: <RiMedalFill className="text-slate-600" size={24} />,
  },
];
const bottomMenuConfig = [
  {
    key: 'setting',
    title: 'Setting',
    icon: <RiSettings2Fill className="text-slate-600" size={24} />,
  },
];

export const SideBar: React.FC = (_props) => {
  const navigate = useNavigate();

  return (
    <div className="flex w-14 flex-col justify-between bg-zinc-50 shadow-sm shadow-slate-400">
      <div>
        {topMenuConfig.map((item) => (
          <Button
            key={item.key}
            type="text"
            className="flex h-14 w-full items-center justify-items-center"
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
            className="flex h-14 w-full items-center justify-items-center"
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
    </div>
  );
};
