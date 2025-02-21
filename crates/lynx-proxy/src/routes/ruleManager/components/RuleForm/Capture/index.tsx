import { Form, Tabs, Typography } from 'antd';
import React from 'react';
import { GlobMatch } from './GlobalMatch';
import { RegexMatch } from './RegexMatch';
import { TestMatch } from './TestMatch';
import { formKeys } from '..';

export const Capture: React.FC = () => {
  return (
    <>
      <Typography.Title level={4}>Capture</Typography.Title>
      <Form.Item name={formKeys.captureType} label="Capture Type">
        <Tabs className="w-full" type="card">
          <Tabs.TabPane tab="Global Match" key="glob">
            <GlobMatch />
          </Tabs.TabPane>
          <Tabs.TabPane tab="Regex Match" key="regex">
            <RegexMatch />
          </Tabs.TabPane>
        </Tabs>
      </Form.Item>
      <TestMatch />
    </>
  );
};
