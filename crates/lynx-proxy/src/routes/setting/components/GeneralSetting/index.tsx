import { useGetAppConfig } from '@/api/app';
import { IAppConfigModel } from '@/api/models';
import { PageLoading } from '@/components/PageLoading';
import { Button, Form, InputNumber, Typography } from 'antd';
import React from 'react';

interface IGeneralSettingProps {}

export const GeneralSetting: React.FC<IGeneralSettingProps> = (props) => {
  const { data: appConfig, isFetching } = useGetAppConfig();
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
        maxLogSize: 1000,
      }}
      onFinish={async ({ maxLogSize }) => {
        // TODO: save general setting
      }}
    >
      <Typography.Title level={4}>General Setting</Typography.Title>
      <Form.Item
        colon={false}
        name={'maxLogSize'}
        label={<span>Maximum number of logs</span>}
      >
        <InputNumber size="small" />
      </Form.Item>

      <Form.Item className="flex justify-end">
        <Button type="primary" htmlType="submit">
          Save
        </Button>
      </Form.Item>
    </Form>
  );
};
