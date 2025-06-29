import React from 'react';
import {
  Form,
  Radio,
  Input,
  Typography,
  Space,
  Divider,
} from 'antd';
import { useTranslation } from 'react-i18next';

export interface ClientProxyConfig {
  proxyRequests: {
    type: 'none' | 'system' | 'custom';
    url?: string;
  };
  apiDebug: {
    type: 'none' | 'system' | 'custom';
    url?: string;
  };
}

interface ProxyConfigSectionProps {
  title: string;
  description: string;
  fieldName: string;
}

const ProxyConfigSection: React.FC<ProxyConfigSectionProps> = ({
  title,
  description,
  fieldName,
}) => {
  const { t } = useTranslation();

  const proxyType = Form.useWatch([fieldName, 'type']);

  const validateProxyUrl = (_: unknown, value: string) => {
    if (proxyType !== 'custom') return Promise.resolve();
    if (!value) {
      return Promise.reject(new Error(t('networkSetting.clientProxy.proxyUrl.validation.required')));
    }
    
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return Promise.reject(new Error(t('networkSetting.clientProxy.proxyUrl.validation.format')));
      }
      return Promise.resolve();
    } catch {
      return Promise.reject(new Error(t('networkSetting.clientProxy.proxyUrl.validation.format')));
    }
  };

  return (
    <div className="mb-6">
      <Space direction="vertical" className="w-full">
        <div>
          <Typography.Title level={5} className="mb-1">
            {title}
          </Typography.Title>
          <Typography.Text type="secondary" className="text-sm">
            {description}
          </Typography.Text>
        </div>

        <Form.Item
          name={[fieldName, 'type']}
          label={t('networkSetting.clientProxy.proxyType.label')}
          initialValue="none"
        >
          <Radio.Group>
            <Radio value="none">{t('networkSetting.clientProxy.proxyType.none')}</Radio>
            <Radio value="system">{t('networkSetting.clientProxy.proxyType.system')}</Radio>
            <Radio value="custom">{t('networkSetting.clientProxy.proxyType.custom')}</Radio>
          </Radio.Group>
        </Form.Item>

        {proxyType === 'custom' && (
          <Form.Item
            name={[fieldName, 'url']}
            label={t('networkSetting.clientProxy.proxyUrl.label')}
            rules={[{ validator: validateProxyUrl }]}
          >
            <Input
              placeholder={t('networkSetting.clientProxy.proxyUrl.placeholder')}
            />
          </Form.Item>
        )}
      </Space>
    </div>
  );
};

export const ClientProxyConfigComponent: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div>
      <div className="mb-4">
        <Typography.Title level={4}>
          {t('networkSetting.clientProxy.title')}
        </Typography.Title>
        <Typography.Paragraph className="text-sm text-gray-600 dark:text-gray-400">
          {t('networkSetting.clientProxy.description')}
        </Typography.Paragraph>
      </div>

      <ProxyConfigSection
        title={t('networkSetting.clientProxy.proxyRequests.title')}
        description={t('networkSetting.clientProxy.proxyRequests.description')}
        fieldName="proxyRequests"
      />

      <Divider />

      <ProxyConfigSection
        title={t('networkSetting.clientProxy.apiDebug.title')}
        description={t('networkSetting.clientProxy.apiDebug.description')}
        fieldName="apiDebug"
      />
    </div>
  );
};
