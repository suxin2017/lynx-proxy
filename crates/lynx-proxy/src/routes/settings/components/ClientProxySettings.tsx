import React from 'react';
import { Button, Space, message, Form } from 'antd';
import { useTranslation } from 'react-i18next';
import { CommonCard } from './CommonCard';
import { ClientProxyConfigComponent } from './NetworkSetting/ClientProxyConfig';
import { useGetClientProxyConfig, useUpdateClientProxyConfig } from '@/services/generated/client-proxy/client-proxy';
import { PageLoading } from '@/components/PageLoading';

export const ClientProxySettings: React.FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  // 客户端代理配置
  const { data: clientProxyData, isLoading } = useGetClientProxyConfig();
  const { mutateAsync: updateClientProxyConfig, isPending: isSaving } = useUpdateClientProxyConfig();
  
  const initialValues = clientProxyData?.data;

  const handleSave = async () => {
    try {
      const formData = await form.validateFields();
      await updateClientProxyConfig({ data: formData });
      messageApi.success(t('networkSetting.messages.saveSuccess'));
    } catch (error) {
      console.error('Save failed:', error);
      messageApi.error(t('networkSetting.messages.saveError'));
    }
  };

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <CommonCard
      title={t('networkSetting.clientProxy.title')}
      subTitle={t('networkSetting.clientProxy.description')}
      extra={
        <Space>
          <Button
            loading={isSaving}
            type="primary"
            onClick={handleSave}
          >
            {t('networkSetting.save')}
          </Button>
        </Space>
      }
    >
      {contextHolder}
      <Form
        className="flex flex-col overflow-hidden"
        layout="vertical"
        form={form}
        initialValues={initialValues}
      >
        <div className="flex-1 overflow-y-auto">
          <ClientProxyConfigComponent />
        </div>
      </Form>
    </CommonCard>
  );
};
