import { CloseCircleOutlined } from '@ant-design/icons';
import { Card, Descriptions, Segmented, Spin, Tag, Typography } from 'antd';
import prettyBytes from 'pretty-bytes';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MonacoEditor } from '../../../components/MonacoEditor';
import { FormattedResponse } from './types';

const { Title, Text } = Typography;

const TAB_KEYS = {
  HEADERS: 'headers',
  BODY: 'body',
} as const;

const STATUS_COLORS = {
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  DEFAULT: 'default',
} as const;

const THEME_COLORS = {
  SUCCESS: '#52c41a',
  ERROR: '#ff4d4f',
} as const;

const CONTENT_TYPES = {
  JSON: 'application/json',
} as const;

const HEADER_KEYS = {
  CONTENT_TYPE_LOWER: 'content-type',
  CONTENT_TYPE_PASCAL: 'Content-Type',
} as const;

const LANGUAGES = {
  JSON: 'json',
  TEXT: 'text',
} as const;



interface ResponseViewerProps {
  response: FormattedResponse | null;
  isLoading: boolean;
  error?: string;
}

export function ResponseViewer({
  response,
  isLoading,
  error,
}: ResponseViewerProps) {
  const [activeTab, setActiveTab] = useState<string>(TAB_KEYS.BODY);
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <Spin size="large" />
        <div className="mt-4">
          <Text>{t('apiDebug.responseViewer.sendingRequest')}</Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <div className="text-center">
            <CloseCircleOutlined
              className="mb-4 text-5xl"
              style={{ color: THEME_COLORS.ERROR }}
            />
            <Title level={4}>{t('apiDebug.responseViewer.requestFailed')}</Title>
            <Text>{error}</Text>
          </div>
        </Card>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex  flex-col items-center justify-center p-12 text-center">
        <Title level={4} type="secondary">
          {t('apiDebug.responseViewer.noResponse')}
        </Title>
        <Text type="secondary">{t('apiDebug.responseViewer.noResponseDescription')}</Text>
      </div>
    );
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return STATUS_COLORS.SUCCESS;
    if (status >= 300 && status < 400) return STATUS_COLORS.WARNING;
    if (status >= 400) return STATUS_COLORS.ERROR;
    return STATUS_COLORS.DEFAULT;
  };

  const detectLanguage = (body: string, contentType?: string) => {
    // 优先根据 Content-Type 检测是否为 JSON
    if (contentType && contentType.includes(CONTENT_TYPES.JSON)) {
      return LANGUAGES.JSON;
    }

    // 尝试解析为 JSON
    try {
      JSON.parse(body);
      return LANGUAGES.JSON;
    } catch {
      // 除了 JSON 外，其他都显示为纯文本
      return LANGUAGES.TEXT;
    }
  };

  return (
    <div className="p-6">
      <Card>
        <div className="mb-6">
          <div className="mb-4 flex items-center gap-4">
            <Tag color={getStatusColor(response.status)}>
              {response.status} {response.statusText}
            </Tag>
            <Text>{t('apiDebug.responseViewer.time')}: {response.responseTime}ms</Text>
            <Text>{t('apiDebug.responseViewer.size')}: {prettyBytes(response.size)}</Text>
          </div>
        </div>

        <div>
          <div className="mb-4">
            <Segmented
              value={activeTab}
              onChange={setActiveTab}
              options={[
                { label: t('apiDebug.responseViewer.headers'), value: TAB_KEYS.HEADERS },
                { label: t('apiDebug.responseViewer.body'), value: TAB_KEYS.BODY },
              ]}
            />
          </div>

          {activeTab === TAB_KEYS.HEADERS && (
            <Card size="small">
              {Object.entries(response.headers).length > 0 ? (
                <Descriptions size="small" column={1}>
                  {Object.entries(response.headers).map(([key, value]) => (
                    <Descriptions.Item key={key} label={key}>
                      <Text code>{value}</Text>
                    </Descriptions.Item>
                  ))}
                </Descriptions>
              ) : (
                <Text type="secondary">{t('apiDebug.responseViewer.noHeaders')}</Text>
              )}
            </Card>
          )}

          {activeTab === TAB_KEYS.BODY && (
            <Card size="small" className="p-0">
              {response.body ? (
                <MonacoEditor
                  value={response.body}
                  language={detectLanguage(
                    response.body,
                    response.headers[HEADER_KEYS.CONTENT_TYPE_LOWER] ||
                      response.headers[HEADER_KEYS.CONTENT_TYPE_PASCAL],
                  )}
                  height={400}
                  readOnly={true}
                  showToolbar={true}
                  showToolbarActions={true}
                  showLineNumbers={true}
                  wordWrap={true}
                  fontSize={14}
                  showMinimap={false}
                  showClearButton={false}
                  showFormatButton={false}
                  showCopyButton={true}
                />
              ) : (
                <div className="p-4">
                  <Text type="secondary">{t('apiDebug.responseViewer.noBodyContent')}</Text>
                </div>
              )}
            </Card>
          )}
        </div>
      </Card>
    </div>
  );
}
