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
  Empty,
  message,
} from 'antd';
import { FormListProps } from 'antd/es/form';
import React from 'react';
import { CommonCard } from '../CommonCard';
import { useGetHealth } from '@/services/generated/default/default';
import { useTranslation } from 'react-i18next';
import {
  useGetHttpsCaptureFilter,
  useUpdateHttpsCaptureFilter,
} from '@/services/generated/https-capture/https-capture';
import { PageLoading } from '@/components/PageLoading';
import { DomainFilter } from '@/services/generated/utoipaAxum.schemas';

const defaultSSLConfig: DomainFilter = {
  enabled: true,
  domain: '',
  port: 443,
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
            <div className="grid grid-cols-[50px_1fr_1fr_80px] gap-4 pb-2">
              <div className="font-medium whitespace-nowrap">
                {t('networkSetting.switch')}
              </div>
              <div className="font-medium">{t('networkSetting.host')}</div>
              <div className="font-medium">{t('networkSetting.port')}</div>
              <div className="font-medium whitespace-nowrap">
                {t('networkSetting.operation')}
              </div>
              {fields.length === 0 && (
                <div className="col-span-4">
                  <Empty
                    description={false}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                </div>
              )}
              {fields.map((field, index) => (
                <React.Fragment key={field.key}>
                  <Form.Item
                    name={[field.name, 'enabled']}
                    className="flex items-center"
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
                          'networkSetting.captureHttps.filter.validation.domain',
                        ),
                      },
                    ]}
                    name={[field.name, 'domain']}
                    className="mb-0 min-w-0"
                  >
                    <Input className="" placeholder="*.example.com" />
                  </Form.Item>
                  <Form.Item
                    required
                    rules={[
                      {
                        type: 'number',
                        required: true,
                        min: 0,
                        max: 65535,
                        message: t(
                          'networkSetting.captureHttps.filter.validation.port',
                        ),
                      },
                    ]}
                    name={[field.name, 'port']}
                  >
                    <InputNumber className="" placeholder="443" />
                  </Form.Item>
                  <Form.Item className="flex items-center space-x-2">
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
                  </Form.Item>
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
  const [form] = Form.useForm();
  const { data } = useGetHealth();
  const { t } = useTranslation();
  const { data: httpsCaptureData, isLoading } = useGetHttpsCaptureFilter();
  const { isPending: isSubmiting, mutateAsync: updateHttpsCaptureFilter } =
    useUpdateHttpsCaptureFilter();

  const initialValues = httpsCaptureData?.data;

  const [messageApi, context] = message.useMessage();

  const handleSave = async () => {
    try {
      const formData = await form.validateFields();
      await updateHttpsCaptureFilter({
        data: formData,
      });
      messageApi.success(t('networkSetting.messages.saveSuccess'));
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <CommonCard
      className='flex-col'
      title={t('networkSetting.title')}
      subTitle={t('networkSetting.subTitle')}
      extra={
        <Space>
          <Button
            loading={isSubmiting}
            type="primary"
            onClick={handleSave}
          >
            {t('networkSetting.save')}
          </Button>
        </Space>
      }
    >

      {context}
      <Form
        className="flex flex-1"
        layout="vertical"
        form={form}
        initialValues={initialValues}
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
                  {data === 'ok' ? (
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
            <Form.Item noStyle name="enabled" valuePropName="checked">
              <Switch className="w-8" />
            </Form.Item>
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
