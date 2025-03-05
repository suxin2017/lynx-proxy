import { Tabs } from 'antd';
import React from 'react';
import { Overview } from '../Overview';
import { Contents } from '../Contents';

interface IDetailProps {}

const initialItems = [
  { label: 'Overview', children: <Overview />, key: '1' },
  { label: 'Contents', children: <Contents />, key: '2' },
];

export const Detail: React.FC<IDetailProps> = (_props) => {
  return (
    <div className="flex-1 bg-white px-2 h-full">
      <Tabs
        animated
        className="h-full flex-1 [&_.ant-tabs-content]:h-full [&_.ant-tabs-tabpane]:h-full"
        defaultActiveKey="1"
        tabBarStyle={{ margin: 0 }}
        items={initialItems}
      ></Tabs>
    </div>
  );
};
