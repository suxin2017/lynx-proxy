import { useGetAppConfig, useSaveGeneralConfig } from '@/api/app';
import { Button, Form, InputNumber, Typography } from 'antd';
import React from 'react';
import { Model as AppConfigModel } from '@/AppConfigModel';

interface IGeneralSettingProps {}

export const GeneralSetting: React.FC<IGeneralSettingProps> = () => {
  const { data: appConfig, isLoading } = useGetAppConfig();
  const { mutateAsync: saveGeneralConfig } = useSaveGeneralConfig();

  const [form] = Form.useForm<AppConfigModel>();

  if (isLoading) {
    return null;
  }
  return (
    <Form
      className="w-full px-6"
      layout="vertical"
      form={form}
      initialValues={{
        maxLogSize: appConfig?.data?.maxLogSize ?? 1000,
        clearLogSize: appConfig?.data?.clearLogSize ?? 100,
      }}
      onFinish={async ({ maxLogSize, clearLogSize }) => {
        await saveGeneralConfig({ maxLogSize, clearLogSize });
      }}
    >
      <Typography.Title level={4}>General Setting</Typography.Title>
      <Form.Item
        colon={false}
        name={'maxLogSize'}
        label={<span>Maximum number of logs</span>}
        rules={[
          {
            required: true,
            message: 'Please input the max log size!',
          },
          {
            type: 'number',
            min: 60,
            max: 6000,
            message: 'The max log size must be between 60 and 6000!',
          },
        ]}
      >
        <InputNumber size="small" />
      </Form.Item>
      <Form.Item
        colon={false}
        name={'clearLogSize'}
        label={'Clear old logs when the max is reached'}
        rules={[
          {
            type: 'number',
            required: true,
            min: 1,
            message: 'The max log size must be greater than 0!',
          },
        ]}
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
