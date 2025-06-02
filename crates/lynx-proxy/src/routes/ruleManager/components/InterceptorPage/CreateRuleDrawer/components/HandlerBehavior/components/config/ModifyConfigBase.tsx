import React from 'react';
import { Form, Input, Button, Typography, Select, Collapse } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useI18n } from '@/contexts/useI18n';

const { Text } = Typography;
const { TextArea } = Input;

interface ModifyConfigBaseProps {
  field: {
    key: number;
    name: number;
  };
  type: 'request' | 'response';
}

export const ModifyConfigBase: React.FC<ModifyConfigBaseProps> = ({
  field,
  type,
}) => {
  const { t } = useI18n();
  const isResponse = type === 'response';
  const isRequest = type === 'request';

  const commonStatusCodes = [
    { value: 200, label: '200 OK' },
    { value: 201, label: '201 Created' },
    { value: 400, label: '400 Bad Request' },
    { value: 401, label: '401 Unauthorized' },
    { value: 403, label: '403 Forbidden' },
    { value: 404, label: '404 Not Found' },
    { value: 500, label: '500 Internal Server Error' },
    { value: 502, label: '502 Bad Gateway' },
    { value: 503, label: '503 Service Unavailable' },
  ];

  const httpMethods = [
    { value: 'GET', label: 'GET' },
    { value: 'POST', label: 'POST' },
    { value: 'PUT', label: 'PUT' },
    { value: 'DELETE', label: 'DELETE' },
    { value: 'PATCH', label: 'PATCH' },
    { value: 'HEAD', label: 'HEAD' },
    { value: 'OPTIONS', label: 'OPTIONS' },
  ];

  const collapseItems = [
    // 状态码配置 - 只在响应类型时显示
    ...(isResponse
      ? [
          {
            key: 'status',
            label: t(
              'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.response.statusCode',
            ),
            children: (
              <div className="space-y-4">
                <Text type="secondary">
                  {t(
                    'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.response.statusCodeDesc',
                  )}
                </Text>
                <Form.Item
                  name={[field.name, 'handlerType', 'statusCode']}
                  label={t(
                    'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.common.statusCode',
                  )}
                  rules={[
                    {
                      type: 'number',
                      min: 100,
                      max: 599,
                      message: t(
                        'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.response.statusCodeValidation',
                      ),
                    },
                  ]}
                >
                  <Select
                    placeholder={t(
                      'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.response.selectStatusCode',
                    )}
                    options={commonStatusCodes}
                    showSearch
                    allowClear
                  />
                </Form.Item>
              </div>
            ),
          },
        ]
      : []),

    // 请求头/响应头配置
    {
      key: 'headers',
      label: isResponse
        ? t(
            'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.response.headers',
          )
        : t(
            'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.request.headers',
          ),
      children: (
        <div className="space-y-4">
          <Text type="secondary">
            {t(
              isResponse
                ? 'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.response.headersDesc'
                : 'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.request.headersDesc',
            )}
          </Text>
          <Form.List name={[field.name, 'handlerType', 'modifyHeaders']}>
            {(headerFields, { add: addHeader, remove: removeHeader }) => (
              <div className="space-y-2">
                {headerFields.map(({ key, name }) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Form.Item
                      name={[name, 'key']}
                      className="mb-0 flex-1"
                      rules={[
                        {
                          required: true,
                          message: t(
                            'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.common.enterName',
                            {
                              type: isResponse
                                ? t(
                                    'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.response.header',
                                  )
                                : t(
                                    'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.request.header',
                                  ),
                            },
                          ),
                        },
                      ]}
                    >
                      <Input
                        placeholder={t(
                          'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.common.headerNamePlaceholder',
                          {
                            type: isResponse
                              ? t(
                                  'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.response.header',
                                )
                              : t(
                                  'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.request.header',
                                ),
                            example: isResponse ? 'Content-Type' : 'User-Agent',
                          },
                        )}
                      />
                    </Form.Item>
                    <Form.Item
                      name={[name, 'value']}
                      className="mb-0 flex-1"
                      rules={[
                        {
                          required: true,
                          message: t(
                            'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.common.enterValue',
                            {
                              type: isResponse
                                ? t(
                                    'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.response.header',
                                  )
                                : t(
                                    'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.request.header',
                                  ),
                            },
                          ),
                        },
                      ]}
                    >
                      <Input
                        placeholder={t(
                          'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.common.headerValuePlaceholder',
                          {
                            type: isResponse
                              ? t(
                                  'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.response.header',
                                )
                              : t(
                                  'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.request.header',
                                ),
                          },
                        )}
                      />
                    </Form.Item>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeHeader(name)}
                    />
                  </div>
                ))}
                <Button
                  type="dashed"
                  onClick={() => addHeader()}
                  icon={<PlusOutlined />}
                  block
                >
                  {t(
                    'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.common.addHeader',
                    {
                      type: isResponse
                        ? t(
                            'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.response.header',
                          )
                        : t(
                            'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.request.header',
                          ),
                    },
                  )}
                </Button>
              </div>
            )}
          </Form.List>
        </div>
      ),
    },

    // 请求方法配置 - 只在请求类型时显示
    ...(isRequest
      ? [
          {
            key: 'method',
            label: t(
              'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.request.method',
            ),
            children: (
              <div className="space-y-4">
                <Text type="secondary">
                  {t(
                    'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.request.methodDesc',
                  )}
                </Text>
                <Form.Item
                  name={[field.name, 'handlerType', 'modifyMethod']}
                  label={t(
                    'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.request.newMethod',
                  )}
                >
                  <Select
                    placeholder={t(
                      'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.request.selectMethod',
                    )}
                    options={httpMethods}
                    allowClear
                  />
                </Form.Item>
              </div>
            ),
          },
        ]
      : []),

    // URL配置 - 只在请求类型时显示
    ...(isRequest
      ? [
          {
            key: 'url',
            label: t(
              'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.request.url',
            ),
            children: (
              <div className="space-y-4">
                <Text type="secondary">
                  {t(
                    'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.request.urlDesc',
                  )}
                </Text>
                <Form.Item
                  name={[field.name, 'handlerType', 'modifyUrl']}
                  label={t(
                    'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.request.newUrl',
                  )}
                  rules={[
                    {
                      type: 'url',
                      message: t(
                        'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.request.urlValidation',
                      ),
                    },
                  ]}
                >
                  <Input placeholder="https://example.com/new-path" />
                </Form.Item>
              </div>
            ),
          },
        ]
      : []),

    // 请求体/响应体配置
    {
      key: 'body',
      label: isResponse
        ? t(
            'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.response.body',
          )
        : t(
            'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.request.body',
          ),
      children: (
        <div className="space-y-4">
          <Text type="secondary">
            {t(
              isResponse
                ? 'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.response.bodyDesc'
                : 'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.request.bodyDesc',
            )}
          </Text>
          <Form.Item
            name={[field.name, 'handlerType', 'modifyBody']}
            label={t(
              'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.common.newBody',
              {
                type: isResponse
                  ? t(
                      'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.response.body',
                    )
                  : t(
                      'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.request.body',
                    ),
              },
            )}
          >
            <TextArea
              rows={isResponse ? 8 : 6}
              placeholder={t(
                'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.common.bodyPlaceholder',
                {
                  type: isResponse
                    ? t(
                        'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.response.body',
                      )
                    : t(
                        'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.request.body',
                      ),
                  formats: isResponse
                    ? 'JSON、HTML、XML、文本'
                    : 'JSON、XML、文本',
                },
              )}
            />
          </Form.Item>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Text strong>
        {t(
          isResponse
            ? 'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.response.title'
            : 'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.request.title',
        )}
      </Text>

      <Collapse
        items={collapseItems}
        size="small"
        defaultActiveKey={['headers', 'body']}
        ghost
      />

      <div className="text-sm text-gray-500">
        <Text type="secondary">
          {t(
            'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.common.optionalDescription',
            {
              type: isResponse
                ? t(
                    'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.response.type',
                  )
                : t(
                    'ruleManager.createRuleDrawer.handlerBehavior.modifyConfig.request.type',
                  ),
            },
          )}
        </Text>
      </div>
    </div>
  );
};
