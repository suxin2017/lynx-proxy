import { useGetAppConfig, useSaveSSLConfig } from '@/api/app';
import { IAppConfigModel } from '@/api/models';
import { PageLoading } from '@/components/PageLoading';
import { RiAddLine, RiDeleteBinLine } from '@remixicon/react';
import { Form, Switch, Input, Button, Typography, InputNumber } from 'antd';
import { FormListProps } from 'antd/es/form';
import React from 'react';

const defaultSSLConfig = {
  switch: true,
  host: '',
  port: undefined,
};

export const IncludeDomainList: React.FC<{ name: FormListProps['name'] }> = ({
  name,
}) => {
  return (
    <Form.List name={name}>
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
                  <Form.Item key={field.key} name={[field.name, 'switch']}>
                    <Switch size="small" />
                  </Form.Item>
                  <Form.Item
                    key={field.key}
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
                    key={field.key}
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
            <div>
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

export const SSLProxySetting: React.FC = () => {
  const { data: appConfig, isFetching } = useGetAppConfig();
  const { captureSSL, sslConfig } = appConfig?.data || ({} as IAppConfigModel);

  const { mutateAsync: saveSSLConfig, isPending } = useSaveSSLConfig();

  const [form] = Form.useForm<IAppConfigModel>();

  if (isFetching) {
    return <PageLoading />;
  }
  return (
    <Form
      className="w-full px-6"
      layout="vertical"
      form={form}
      initialValues={{
        sslConfig,
        captureSSL,
      }}
      onFinish={async ({ captureSSL, sslConfig }) => {
        await saveSSLConfig({
          captureSSL,
          includeDomains: sslConfig.includeDomains ?? [],
          excludeDomains: sslConfig.excludeDomains ?? [],
        });
      }}
    >
      <Typography.Title level={3}>SSL Proxying Setting</Typography.Title>
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
        label={<Typography.Title level={4}>Include Domain</Typography.Title>}
      >
        <IncludeDomainList name={['sslConfig', 'includeDomains']} />
      </Form.Item>
      <Form.Item
        label={<Typography.Title level={4}>Exclude Domain</Typography.Title>}
      >
        <IncludeDomainList name={['sslConfig', 'excludeDomains']} />
      </Form.Item>
      <Form.Item>
        <Button disabled={isPending} type="primary" htmlType="submit">
          Save
        </Button>
      </Form.Item>
    </Form>
  );
};
