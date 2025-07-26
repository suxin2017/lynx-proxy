import React from 'react';
import { Form, Input, Select, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;
const { TextArea } = Input;

interface HtmlScriptInjectorConfigProps {
  field: {
    key: number;
    name: number;
  };
}

export const HtmlScriptInjectorConfig: React.FC<HtmlScriptInjectorConfigProps> = ({ field }) => {
  const { t } = useTranslation();

  const injectionPositions = [
    { value: 'head', label: t('ruleManager.quickAdd.htmlScriptInjector.config.injectionPosition.options.head') },
    { value: 'body-start', label: t('ruleManager.quickAdd.htmlScriptInjector.config.injectionPosition.options.bodyStart') },
    { value: 'body-end', label: t('ruleManager.quickAdd.htmlScriptInjector.config.injectionPosition.options.bodyEnd') },
  ];

  return (
    <div className="space-y-4">

      <div className="space-y-4">
        <Form.Item
          name={[field.name, 'handlerType', 'content']}
          label={t('ruleManager.quickAdd.htmlScriptInjector.config.content.label')}
          extra={t('ruleManager.quickAdd.htmlScriptInjector.config.content.extra')}
          rules={[
            {
              required: true,
              message: t('ruleManager.quickAdd.htmlScriptInjector.config.content.required'),
            },
          ]}
        >
          <TextArea
            placeholder={t('ruleManager.quickAdd.htmlScriptInjector.config.content.placeholder')}
            rows={6}
            showCount
          />
        </Form.Item>

        <Form.Item
          name={[field.name, 'handlerType', 'injectionPosition']}
          label={t('ruleManager.quickAdd.htmlScriptInjector.config.injectionPosition.label')}
          initialValue="body-end"
        >
          <Select
            placeholder={t('ruleManager.quickAdd.htmlScriptInjector.config.injectionPosition.placeholder')}
            options={injectionPositions}
          />
        </Form.Item>
      </div>

      <div className="text-sm text-gray-500 space-y-1">
        <div>• {t('ruleManager.quickAdd.htmlScriptInjector.config.tips.tip1')}</div>
        <div>• {t('ruleManager.quickAdd.htmlScriptInjector.config.tips.tip2')}</div>
        <div>• {t('ruleManager.quickAdd.htmlScriptInjector.config.tips.tip3')}</div>
      </div>
    </div>
  );
};
