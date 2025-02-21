import { Form, Input, Switch } from 'antd';
import React from 'react';

interface IConnectProps {}

export const Connect: React.FC<IConnectProps> = () => {
  return (
    <div>
      <Form.Item label="Break Connect">
        <Switch className="w-8" size="small" />
      </Form.Item>
      <Form.Item label="Pass Proxy">
        <Input />
      </Form.Item>
    </div>
  );
};
