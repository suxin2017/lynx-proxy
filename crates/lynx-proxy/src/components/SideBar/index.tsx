import { RiEqualizer2Line, RiMedalLine, RiPlanetLine } from '@remixicon/react';
import { useNavigate } from '@tanstack/react-router';
import { Button, Space } from 'antd';
import React from 'react';

export const SideBar: React.FC = (_props) => {
  const navigate = useNavigate();

  return (
    <div className="pt-4 w-11 flex justify-center shadow-sm shadow-slate-400">
      <Space direction="vertical" className="w-full">
        <Button
          type="text"
          className="flex items-center justify-items-center w-full"
          onClick={() => {
            navigate({
              to: '/network',
            });
          }}
          icon={<RiPlanetLine size={24} />}
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
          icon={<RiEqualizer2Line size={24} />}
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
          icon={<RiMedalLine size={24} />}
        />
      </Space>
    </div>
  );
};
