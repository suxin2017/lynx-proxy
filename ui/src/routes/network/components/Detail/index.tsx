import { Tabs } from 'antd';
import React from 'react';
import { Overview } from '../Overview';
import { Contents } from '../Contents';

interface IDetailProps {}

const initialItems = [
  { label: 'Overview', children: <Overview />, key: '1' },
  { label: 'Contents', children: <Contents />, key: '2' },
  {
    label: 'Tab 3',
    children: 'Content of Tab 3',
    key: '3',
    closable: false,
  },
];

export const Detail: React.FC<IDetailProps> = (_props) => {
  return (
    <div className="bg-white px-2 flex-1">
      <Tabs defaultActiveKey="2" items={initialItems}></Tabs>
    </div>
  );
};
