import { Form, FormListFieldData, Input, Switch } from 'antd';
import React from 'react';
import { IHandlerData } from '../..';
import { HandlerType } from '../constant';


export const ConnectBreakConnect: React.FC<{ field: FormListFieldData }> = ({ field }) => {
  return (
    <Form.Item noStyle name={[field.name, 'breakConnect']} valuePropName="checked">
      <Switch className="w-8" size="small" />
    </Form.Item>
  );
};

export type IConnectPassProxyData = IHandlerData<{
  url: string
}, HandlerType.ConnectPassProxy>;

export const ConnectPassProxy: React.FC<{ field: FormListFieldData }> = ({ field }) => {
  return (
    <Form.Item label="Pass Proxy Url" name={[field.name, 'url']}>
      <Input />
    </Form.Item>
  );
}

