import React, { useState, useCallback, useMemo } from 'react';
import { Input, Select, Space, Typography, Button } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { SimpleCaptureCondition as SimpleCaptureConditionType } from '@/services/generated/utoipaAxum.schemas';
import { useI18n } from '@/contexts';

const { Text } = Typography;
const { Option } = Select;

interface SimpleCaptureConditionProps {
  value?: SimpleCaptureConditionType;
  onChange?: (value: SimpleCaptureConditionType) => void;
  titleExtra?: React.ReactNode;
}

const UrlPatternInput = React.memo(
  ({
    urlPattern,
    onChange,
    onRemove,
  }: {
    urlPattern?: { captureType?: string; pattern?: string };
    onChange: (data: { captureType?: string; pattern?: string }) => void;
    onRemove?: () => void;
  }) => {
    const { t } = useI18n();
    return (
      <div className="w-full">
        <div className="mb-2 flex items-center justify-between">
          <Text strong className="block">
            {t('ruleManager.createRuleDrawer.captureRule.urlPattern')}
          </Text>
          {onRemove && (
            <Button type="text" size="small" danger onClick={onRemove}>
              {t('ruleManager.actions.delete')}
            </Button>
          )}
        </div>
        <Space direction="vertical" className="w-full">
          <div className="flex gap-2">
            <Select
              placeholder={t(
                'ruleManager.createRuleDrawer.captureRule.selectMatchType',
              )}
              className="w-32"
              value={urlPattern?.captureType || 'glob'}
              onChange={(captureType) => onChange({ captureType: captureType })}
            >
              <Option value="glob">Glob</Option>
              <Option value="regex">Regex</Option>
              <Option value="exact">
                {t('ruleManager.captureTypes.exact')}
              </Option>
              <Option value="contains">
                {t('ruleManager.captureTypes.contains')}
              </Option>
            </Select>
            <Input
              placeholder={t(
                'ruleManager.createRuleDrawer.captureRule.urlPatternPlaceholder',
              )}
              className="flex-1"
              value={urlPattern?.pattern || ''}
              onChange={(e) => onChange({ pattern: e.target.value })}
            />
          </div>
          <Text type="secondary" className="text-xs">
            {(urlPattern?.captureType || 'glob') === 'glob' &&
              t('ruleManager.createRuleDrawer.captureRule.globHelp')}
            {(urlPattern?.captureType || 'glob') === 'regex' &&
              t('ruleManager.createRuleDrawer.captureRule.regexHelp')}
            {(urlPattern?.captureType || 'glob') === 'exact' &&
              t('ruleManager.createRuleDrawer.captureRule.exactHelp')}
            {(urlPattern?.captureType || 'glob') === 'contains' &&
              t('ruleManager.createRuleDrawer.captureRule.containsHelp')}
          </Text>
        </Space>
      </div>
    );
  },
);

UrlPatternInput.displayName = 'UrlPatternInput';

const MethodInput = React.memo(
  ({
    value,
    onChange,
    onRemove,
  }: {
    value?: string;
    onChange: (method: string | null) => void;
    onRemove: () => void;
  }) => {
    const { t } = useI18n();
    return (
      <div className="w-full">
        <div className="mb-2 flex items-center justify-between">
          <Text strong>
            {t('ruleManager.createRuleDrawer.captureRule.httpMethod')}
          </Text>
          <Button type="text" size="small" danger onClick={onRemove}>
            {t('ruleManager.actions.remove')}
          </Button>
        </div>
        <Select
          placeholder={t(
            'ruleManager.createRuleDrawer.captureRule.selectHttpMethod',
          )}
          allowClear
          className="mb-1 w-full"
          value={value || undefined}
          onChange={onChange}
        >
          <Option value="GET">GET</Option>
          <Option value="POST">POST</Option>
          <Option value="PUT">PUT</Option>
          <Option value="DELETE">DELETE</Option>
          <Option value="PATCH">PATCH</Option>
          <Option value="HEAD">HEAD</Option>
          <Option value="OPTIONS">OPTIONS</Option>
        </Select>
        <Text type="secondary" className="block text-xs">
          {t('ruleManager.createRuleDrawer.captureRule.httpMethodEmptyHelp')}
        </Text>
      </div>
    );
  },
);

MethodInput.displayName = 'MethodInput';

const HostInput = React.memo(
  ({
    value,
    onChange,
    onRemove,
  }: {
    value?: string;
    onChange: (host: string) => void;
    onRemove: () => void;
  }) => {
    const { t } = useI18n();
    return (
      <div className="w-full">
        <div className="mb-2 flex items-center justify-between">
          <Text strong>
            {t('ruleManager.createRuleDrawer.captureRule.hostname')}
          </Text>
          <Button type="text" size="small" danger onClick={onRemove}>
            {t('ruleManager.actions.remove')}
          </Button>
        </div>
        <Input
          placeholder={t(
            'ruleManager.createRuleDrawer.captureRule.hostnamePlaceholder',
          )}
          className="mb-1"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
        <Text type="secondary" className="block text-xs">
          {t('ruleManager.createRuleDrawer.captureRule.hostnameEmptyHelp')}
        </Text>
      </div>
    );
  },
);

HostInput.displayName = 'HostInput';

const HeadersInput = React.memo(
  ({
    headers,
    onRemove,
    onAdd,
    onUpdate,
    onDelete,
  }: {
    headers: Array<{ key: string; value: string }>;
    onRemove: () => void;
    onAdd: () => void;
    onUpdate: (index: number, key: string, value: string) => void;
    onDelete: (index: number) => void;
  }) => {
    const { t } = useI18n();
    return (
      <div className="w-full">
        <div className="mb-2 flex items-center justify-between">
          <Text strong>
            {t('ruleManager.createRuleDrawer.captureRule.headers')}
          </Text>
          <Button type="text" size="small" danger onClick={onRemove}>
            {t('ruleManager.actions.remove')}
          </Button>
        </div>
        {headers.length > 0 ? (
          <Space direction="vertical" className="w-full">
            {headers.map((header, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder={t(
                    'ruleManager.createRuleDrawer.captureRule.headerName',
                  )}
                  className="flex-1"
                  value={header.key}
                  onChange={(e) =>
                    onUpdate(index, e.target.value, header.value)
                  }
                />
                <Input
                  placeholder={t(
                    'ruleManager.createRuleDrawer.captureRule.headerValue',
                  )}
                  className="flex-1"
                  value={header.value}
                  onChange={(e) => onUpdate(index, header.key, e.target.value)}
                />
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => onDelete(index)}
                />
              </div>
            ))}
          </Space>
        ) : (
          <Text type="secondary" className="text-xs">
            {t('ruleManager.createRuleDrawer.captureRule.noHeadersHelp')}
          </Text>
        )}
        <div className="mt-2">
          <Button type="dashed" icon={<PlusOutlined />} onClick={onAdd}>
            {t('ruleManager.createRuleDrawer.captureRule.addHeader')}
          </Button>
        </div>
      </div>
    );
  },
);

HeadersInput.displayName = 'HeadersInput';

const AddFieldButtons = React.memo(
  ({
    showMethod,
    onShowUrlPattern,
    showUrlPattern,
    showHost,
    showHeaders,
    onShowMethod,
    onShowHost,
    onShowHeaders,
  }: {
    showMethod: boolean;
    showHost: boolean;
    showHeaders: boolean;
    showUrlPattern: boolean;
    onShowMethod: () => void;
    onShowHost: () => void;
    onShowHeaders: () => void;
    onShowUrlPattern: () => void;
  }) => {
    const { t } = useI18n();
    return (
      <div className="w-full">
        <Text type="secondary" className="mb-2 block">
          {t('ruleManager.createRuleDrawer.captureRule.addOptionalConditions')}
        </Text>
        <Space wrap>
          {!showMethod && (
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={onShowMethod}
            >
              {t('ruleManager.createRuleDrawer.captureRule.httpMethod')}
            </Button>
          )}
          {!showHost && (
            <Button type="dashed" icon={<PlusOutlined />} onClick={onShowHost}>
              {t('ruleManager.createRuleDrawer.captureRule.hostname')}
            </Button>
          )}
          {!showHeaders && (
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={onShowHeaders}
            >
              {t('ruleManager.createRuleDrawer.captureRule.headers')}
            </Button>
          )}
          {!showUrlPattern && (
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={onShowUrlPattern}
            >
              {t('ruleManager.createRuleDrawer.captureRule.urlPattern')}
            </Button>
          )}
        </Space>
      </div>
    );
  },
);

AddFieldButtons.displayName = 'AddFieldButtons';

export const SimpleCaptureCondition: React.FC<SimpleCaptureConditionProps> =
  React.memo(({ value = {}, onChange }) => {
    const [showMethod, setShowMethod] = useState(!!value.method);
    const [showHost, setShowHost] = useState(!!value.host);
    const [showHeaders, setShowHeaders] = useState(!!value.headers);
    const [showUrlPattern, setShowUrlPattern] = useState(!!value.urlPattern);

    const handleChange = useCallback(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (field: keyof SimpleCaptureConditionType, fieldValue: any) => {
        const newValue = { ...value, [field]: fieldValue };
        onChange?.(newValue);
      },
      [value, onChange],
    );

    const handleUrlPatternChange = useCallback(
      (urlPatternData: { captureType?: string; pattern?: string }) => {
        const currentUrlPattern = value.urlPattern || {
          captureType: 'glob',
          pattern: '',
        };
        const newUrlPattern = {
          captureType:
            urlPatternData.captureType ??
            currentUrlPattern.captureType ??
            'glob',
          pattern: urlPatternData.pattern ?? currentUrlPattern.pattern ?? '',
        };
        handleChange('urlPattern', newUrlPattern);
      },
      [value.urlPattern, handleChange],
    );

    // 将后端格式转换为前端编辑格式
    const getHeadersAsArray = useCallback((): Array<{
      key: string;
      value: string;
    }> => {
      if (!value.headers) return [];
      return value.headers.map((header) => {
        const [key, val] = Object.entries(header)[0] || ['', ''];
        return { key, value: val };
      });
    }, [value.headers]);

    const handleHeaderChange = useCallback(
      (headers: Array<{ key: string; value: string }>) => {
        // Convert to backend expected format: Array<{ [key: string]: string }>
        const formattedHeaders = headers.map((header) => ({
          [header.key]: header.value,
        }));
        handleChange(
          'headers',
          formattedHeaders.length > 0 ? formattedHeaders : null,
        );
      },
      [handleChange],
    );

    const addHeader = useCallback(() => {
      const currentHeaders = getHeadersAsArray();
      const newHeaders = [...currentHeaders, { key: '', value: '' }];
      handleHeaderChange(newHeaders);
    }, [getHeadersAsArray, handleHeaderChange]);

    const removeHeader = useCallback(
      (index: number) => {
        const currentHeaders = getHeadersAsArray();
        const newHeaders = currentHeaders.filter((_, i) => i !== index);
        handleHeaderChange(newHeaders);
      },
      [getHeadersAsArray, handleHeaderChange],
    );

    const updateHeader = useCallback(
      (index: number, key: string, headerValue: string) => {
        const currentHeaders = getHeadersAsArray();
        const newHeaders = [...currentHeaders];
        newHeaders[index] = { key, value: headerValue };
        handleHeaderChange(newHeaders);
      },
      [getHeadersAsArray, handleHeaderChange],
    );

    const headersArray = useMemo(
      () => getHeadersAsArray(),
      [getHeadersAsArray],
    );

    return (
      <Space direction="vertical" className="w-full" size="middle">
        {showUrlPattern && (
          <UrlPatternInput
            urlPattern={value.urlPattern ? { ...value.urlPattern } : undefined}
            onChange={handleUrlPatternChange}
            onRemove={() => {
              setShowUrlPattern(false);
              handleChange('urlPattern', null);
            }}
          />
        )}
        {showMethod && (
          <MethodInput
            value={typeof value.method === 'string' ? value.method : undefined}
            onChange={(m) => handleChange('method', m)}
            onRemove={() => {
              setShowMethod(false);
              handleChange('method', null);
            }}
          />
        )}
        {showHost && (
          <HostInput
            value={typeof value.host === 'string' ? value.host : undefined}
            onChange={(h) => handleChange('host', h)}
            onRemove={() => {
              setShowHost(false);
              handleChange('host', null);
            }}
          />
        )}
        {showHeaders && (
          <HeadersInput
            headers={headersArray}
            onRemove={() => {
              setShowHeaders(false);
              handleChange('headers', null);
            }}
            onAdd={addHeader}
            onUpdate={updateHeader}
            onDelete={removeHeader}
          />
        )}
        {(!showUrlPattern || !showHost || !showMethod || !showHeaders) && (
          <AddFieldButtons
            showMethod={showMethod}
            showHost={showHost}
            showUrlPattern={showUrlPattern}
            showHeaders={showHeaders}
            onShowUrlPattern={() => setShowUrlPattern(true)}
            onShowMethod={() => setShowMethod(true)}
            onShowHost={() => setShowHost(true)}
            onShowHeaders={() => {
              setShowHeaders(true);
              if (!value.headers) handleHeaderChange([{ key: '', value: '' }]);
            }}
          />
        )}
      </Space>
    );
  });

SimpleCaptureCondition.displayName = 'SimpleCaptureCondition';
