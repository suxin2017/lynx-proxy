import { Tabs, Typography } from 'antd';
import React from 'react';
import { GlobMatch } from './GlobalMatch';
import { RegexMatch } from './RegexMatch';
import { TestMatch } from './TestMatch';
import { RuleFormItem } from '..';

export const Capture: React.FC = () => {
  return (
    <>
      <Typography.Title level={4}>Capture</Typography.Title>
      <RuleFormItem
        name={['capture', 'type']}
        label="Capture Type"
        valuePropName="activeKey"
      >
        <Tabs
          className="w-full"
          type="card"
          items={[
            {
              label: 'Regex',
              key: 'regex',
              children: <RegexMatch />,
            },
            {
              label: 'Global',
              key: 'glob',
              children: <GlobMatch />,
            },
          ]}
        />
      </RuleFormItem>
      <TestMatch />
    </>
  );
};
