import { LanguageSelector } from '@/components/LanguageSelector';
import { ConnectType, useGeneralSetting } from '@/store/useGeneralState';
import { Button, Form, InputNumber, message, Select, Space, Typography, App } from 'antd';
import React from 'react';
import { useI18n } from '@/contexts';
import { CommonCard } from '../CommonCard';

interface IGeneralSettingProps { }

export const GeneralSetting: React.FC<IGeneralSettingProps> = () => {
  const [form] = Form.useForm();
  const { generalSetting, setGeneralSetting } = useGeneralSetting();
  const [messageApi, contextHolder] = message.useMessage();
  const { t } = useI18n();
  const { language, setLanguage } = useI18n();
  const { modal } = App.useApp();


  const handleLanguageChange = (value: string) => {
    setLanguage(value as 'en' | 'zh-CN');
  };
  return (
    <CommonCard
      title={t('settings.general.title')}
      subTitle={t('settings.general.subTitle')}
      extra={
        <Space>
          <Button
            type="primary"
            onClick={() => {
              form.validateFields().then(() => {
                form.submit();
              });
            }}
          >
            {t('settings.general.actions.save')}
          </Button>
          <Button
            type="dashed"
            onClick={() => {
              form.resetFields();
            }}
          >
            {t('settings.general.actions.reset')}
          </Button>
        </Space>
      }
    >
      {contextHolder}
      <Form
        className="w-full"
        layout="vertical"
        form={form}
        initialValues={{ ...generalSetting, language }}
        onFinish={async ({ language, ...value }) => {
          if (value.connectType !== generalSetting?.connectType) {
            modal.confirm({
              title: t('settings.general.connectType.changeConfirm.title'),
              content: t('settings.general.connectType.changeConfirm.content'),
              onOk: () => {
                setGeneralSetting(value);
                handleLanguageChange(language);
                messageApi.success(t('settings.general.actions.save'));
                location.reload();
              },
            });
          } else {
            setGeneralSetting(value)
            handleLanguageChange(language);
            messageApi.success(t('settings.general.actions.save'));
          }

        }}
      >
        <Typography.Title level={5} className="mb-2">
          {t('settings.general.language')}
        </Typography.Title>
        <Form.Item
          name="language"
        >
          <LanguageSelector />
        </Form.Item>
        <Typography.Title level={5} className="mb-2">
          {t('settings.general.maxLogSize.title')}
        </Typography.Title>
        <Typography.Paragraph className="mb-2">
          {t('settings.general.maxLogSize.description')}
        </Typography.Paragraph>

        <Form.Item
          colon={false}
          name={'maxLogSize'}
          rules={[
            {
              required: true,
              message: t('settings.general.maxLogSize.validation.required'),
            },
            {
              type: 'number',
              min: 60,
              max: 6000,
              message: t('settings.general.maxLogSize.validation.range'),
            },
          ]}
        >
          <InputNumber className="w-full" />
        </Form.Item>
        <Typography.Title level={5} className="mb-2">
          {t('settings.general.connectType.title')}
        </Typography.Title>
        <Form.Item
          colon={false}
          name={'connectType'}
          rules={[
            {
              required: true,
              message: t('settings.general.connectType.validation.required'),
            },
          ]}
        >
          <Select>
            <Select.Option value={ConnectType.ShortPoll}>
              {t('settings.general.connectType.shortPoll')}
            </Select.Option>
            <Select.Option value={ConnectType.SSE}>
              {t('settings.general.connectType.sse')}
            </Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </CommonCard>
  );
};
