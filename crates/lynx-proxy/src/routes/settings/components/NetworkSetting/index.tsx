import { IAppConfigModel } from '@/api/models';
import { RiAddLine, RiDeleteBinLine } from '@remixicon/react';
import { Form, Switch, Input, Button, Typography, InputNumber } from 'antd';
import { FormListProps } from 'antd/es/form';
import React from 'react';
import { CommonCard } from '../CommonCard';

const defaultSSLConfig = {
  switch: true,
  host: '',
  port: undefined,
};

export const IncludeDomainList: React.FC<{ name: FormListProps['name'] }> = ({
  name,
}) => {
  return (
    <Form.List
      name={name}
      initialValue={[
        {
          switch: true,
        },
      ]}
    >
      {(fields, { add, remove }) => {
        return (
          <div>
            <div className="grid grid-cols-[48px_256px_56px_56px] gap-1 pb-2">
              <div>Switch</div>
              <div className="w-64">Host</div>
              <div>Port </div>
              <div>Operation </div>
              {fields.map((field, index) => (
                <React.Fragment key={field.key}>
                  <Form.Item name={[field.name, 'switch']}>
                    <Switch size="small" />
                  </Form.Item>
                  <Form.Item
                    required
                    rules={[
                      {
                        type: 'string',
                        required: true,
                        message: 'Invalid host',
                      },
                    ]}
                    name={[field.name, 'host']}
                  >
                    <Input
                      className="w-64"
                      placeholder="*.example.com,127.0.0.1"
                    />
                  </Form.Item>
                  <Form.Item
                    required
                    rules={[
                      {
                        type: 'number',
                        message: 'Invalid port',
                      },
                    ]}
                    name={[field.name, 'port']}
                  >
                    <InputNumber className="w-12" placeholder="443" />
                  </Form.Item>
                  <div>
                    <Button
                      type="text"
                      onClick={() => {
                        add(defaultSSLConfig);
                      }}
                      icon={<RiAddLine size={14} />}
                    />
                    <Button
                      type="text"
                      onClick={() => {
                        remove(index);
                      }}
                      icon={<RiDeleteBinLine size={14} />}
                    />
                  </div>
                </React.Fragment>
              ))}
            </div>
            <div className="flex justify-end">
              <Button
                type="primary"
                onClick={() => {
                  add(defaultSSLConfig);
                }}
              >
                Add
              </Button>
            </div>
          </div>
        );
      }}
    </Form.List>
  );
};

export const NetworkSetting: React.FC = () => {
  const [form] = Form.useForm<IAppConfigModel>();

  return (
    <CommonCard
      title="Network Setting"
      subTitle="Configure network settings for the application"
    >
      <Form
        className="w-full px-6"
        layout="vertical"
        form={form}
        initialValues={{}}
        // onFinish={async ({ captureSSL, sslConfig }) => {}}
      >
        <Typography.Title level={4}>SSL Proxying Setting</Typography.Title>
        <Form.Item
          layout="horizontal"
          colon={false}
          name={'captureSSL'}
          valuePropName="checked"
          label={<span>Enable SSL Proxying</span>}
        >
          <Switch className="w-8" size="small" />
        </Form.Item>
        <Form.Item
          label={<Typography.Title level={5}>Include Domain</Typography.Title>}
        >
          <IncludeDomainList name={['sslConfig', 'includeDomains']} />
        </Form.Item>
        <Form.Item
          label={<Typography.Title level={5}>Exclude Domain</Typography.Title>}
        >
          <IncludeDomainList name={['sslConfig', 'excludeDomains']} />
        </Form.Item>
        <Form.Item className="flex justify-end">
          <Button type="primary" htmlType="submit">
            Save
          </Button>
        </Form.Item>
      </Form>
    </CommonCard>
  );
};
