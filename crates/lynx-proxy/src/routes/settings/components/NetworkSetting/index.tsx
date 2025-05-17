import { IAppConfigModel } from '@/api/models';
import {
  RiAddLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiDeleteBinLine,
} from '@remixicon/react';
import {
  Form,
  Switch,
  Input,
  Button,
  Typography,
  InputNumber,
  Space,
} from 'antd';
import { FormListProps } from 'antd/es/form';
import React from 'react';
import { CommonCard } from '../CommonCard';
import { useGetHealth } from '@/services/generated/default/default';
import { useTranslation } from 'react-i18next';

const defaultSSLConfig = {
  switch: true,
  host: '',
  port: undefined,
};

export const IncludeDomainList: React.FC<{ name: FormListProps['name'] }> = ({
  name,
}) => {
  const { t } = useTranslation();

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
            <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 pb-2">
              <div className="font-medium whitespace-nowrap">
                {t('networkSetting.switch')}
              </div>
              <div className="font-medium">{t('networkSetting.host')}</div>
              <div className="font-medium">{t('networkSetting.port')}</div>
              <div className="font-medium whitespace-nowrap">
                {t('networkSetting.operation')}
              </div>
              {fields.map((field, index) => (
                <React.Fragment key={field.key}>
                  <Form.Item
                    name={[field.name, 'switch']}
                    className="mb-0 flex items-center"
                  >
                    <Switch />
                  </Form.Item>
                  <Form.Item
                    required
                    rules={[
                      {
                        type: 'string',
                        required: true,
                        message: t(
                          'networkSetting.captureHttps.filter.invalidHost',
                        ),
                      },
                    ]}
                    name={[field.name, 'host']}
                    className="mb-0 min-w-0"
                  >
                    <Input
                      className="w-full"
                      placeholder="*.example.com,127.0.0.1"
                    />
                  </Form.Item>
                  <Form.Item
                    required
                    rules={[
                      {
                        type: 'number',
                        message: t(
                          'networkSetting.captureHttps.filter.invalidPort',
                        ),
                      },
                    ]}
                    name={[field.name, 'port']}
                    className="mb-0 min-w-0"
                  >
                    <InputNumber className="w-full" placeholder="443" />
                  </Form.Item>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="text"
                      onClick={() => {
                        add(defaultSSLConfig);
                      }}
                      icon={<RiAddLine size={16} />}
                    />
                    <Button
                      type="text"
                      onClick={() => {
                        remove(index);
                      }}
                      icon={<RiDeleteBinLine size={16} />}
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
                {t('networkSetting.add')}
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
  const { data } = useGetHealth();
  const { t } = useTranslation();

  return (
    <CommonCard
      title={t('networkSetting.title')}
      subTitle={t('networkSetting.subTitle')}
      extra={
        <Space>
          <Button
            type="primary"
            onClick={() => {
              form.resetFields();
            }}
          >
            {t('networkSetting.save')}
          </Button>
          <Button
            type="dashed"
            onClick={() => {
              form.resetFields();
            }}
          >
            {t('networkSetting.reset')}
          </Button>
        </Space>
      }
    >
      <Form
        className="flex flex-col overflow-hidden"
        layout="vertical"
        form={form}
        initialValues={{}}
      >
        <div className="flex-1 overflow-y-auto">
          <div className="my-2 flex items-center justify-between">
            <Space direction="vertical">
              <Typography.Title level={5}>
                {t('networkSetting.captureHttps.title')}
              </Typography.Title>
              <Typography.Paragraph className="mb-0 flex items-center gap-2">
                <span>{t('networkSetting.captureHttps.description')}</span>
                <span className="flex items-center gap-1">
                  {t('networkSetting.captureHttps.status')}:
                  {data !== 'ok' ? (
                    <RiCheckboxCircleLine
                      className="inline-block text-green-400 dark:text-green-500"
                      size={14}
                    />
                  ) : (
                    <RiCloseCircleLine
                      className="inline-block text-red-400 dark:text-red-500"
                      size={14}
                    />
                  )}
                </span>
              </Typography.Paragraph>
            </Space>
            <Switch className="w-8" />
          </div>
          <Typography.Title level={5}>
            {t('networkSetting.captureHttps.filter.title')}
          </Typography.Title>
          <Typography.Paragraph className="mb-2">
            {t('networkSetting.captureHttps.filter.description')}
          </Typography.Paragraph>
          <Form.Item
            label={
              <Typography.Title level={5} className="mt-2">
                {t('networkSetting.captureHttps.filter.includeDomains')}
              </Typography.Title>
            }
          >
            <IncludeDomainList name={['includeDomains']} />
          </Form.Item>
          <Form.Item
            label={
              <Typography.Title level={5} className="mt-2">
                {t('networkSetting.captureHttps.filter.excludeDomains')}
              </Typography.Title>
            }
          >
            <IncludeDomainList name={['excludeDomains']} />
          </Form.Item>
        </div>
      </Form>
    </CommonCard>
  );
};
