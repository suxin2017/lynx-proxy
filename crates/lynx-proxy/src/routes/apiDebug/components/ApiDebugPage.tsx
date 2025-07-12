import { message, Segmented, Button } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { RequestBuilder } from './RequestBuilder';
import { HeadersEditor } from './HeadersEditor';
import { QueryParamsEditor } from './QueryParamsEditor';
import { BodyEditor } from './BodyEditor';
import { ResponseViewer } from './ResponseViewer';
import { CurlImportModal } from './CurlImportModal';
import { RequestHistory } from './RequestHistory';
import { useExecuteApiRequest } from '../../../services/generated/api-debug-executor/api-debug-executor';
import { getListDebugEntriesQueryKey } from '../../../services/generated/api-debug/api-debug';
import { useQueryClient } from '@tanstack/react-query';
import {
  HttpMethod,
  ApiDebugResponse,
} from '../../../services/generated/utoipaAxum.schemas';
import { QueryParamItem, FormattedResponse } from './types';
import { CommonCard } from '@/routes/settings/components/CommonCard';
import { useApiDebug } from './store';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const TAB_KEYS = {
  PARAMS: 'params',
  HEADERS: 'headers',
  BODY: 'body',
} as const;

export function ApiDebugPage() {
  const [activeTab, setActiveTab] = useState<string>(TAB_KEYS.PARAMS);
  const [historyVisible, setHistoryVisible] = useState<boolean>(true);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const {
    method,
    url,
    headers,
    queryParams,
    body,
    response,
    curlModalVisible,
    setMethod,
    setHeaders,
    setBody,
    setResponse,
    setCurlModalVisible,
    importCurl,
    updateUrlAndParams,
    updateParamsAndUrl,
    loadFromApiDebugResponse,
  } = useApiDebug();

  // 自定义的查询参数设置函数，同时更新URL
  const handleQueryParamsChange = (newParams: QueryParamItem[]) => {
    updateParamsAndUrl(newParams);
  };

  // 自定义的URL设置函数，同时解析查询参数
  const handleUrlChange = (newUrl: string) => {
    updateUrlAndParams(newUrl);
  };

  const executeRequestMutation = useExecuteApiRequest<Error>({
    mutation: {
      onSuccess: (data) => {
        const responseData = data.data;
        if (responseData) {
          const formattedResponse: FormattedResponse = {
            status: responseData.responseStatus || 0,
            statusText: getStatusText(responseData.responseStatus || 0),
            headers:
              (responseData.responseHeaders as Record<string, string>) || {},
            body: responseData.responseBody || '',
            responseTime: responseData.responseTime || 0,
            size: responseData.responseBody
              ? new Blob([responseData.responseBody]).size
              : 0,
          };
          setResponse(formattedResponse);
        }
        // 自动刷新历史记录
        queryClient.invalidateQueries({
          queryKey: getListDebugEntriesQueryKey(),
        });
        message.success(t('apiDebug.requestCompleted'));
      },
      onError: (error) => {
        console.error('Request failed:', error);
        message.error(t('apiDebug.requestFailed'));
        setResponse(null);
      },
    },
  });

  const getStatusText = (status: number): string => {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      500: 'Internal Server Error',
    };
    return statusTexts[status] || 'Unknown';
  };

  const handleSendRequest = () => {
    if (!url) {
      message.warning(t('apiDebug.enterUrl'));
      return;
    }

    // Build URL with query parameters
    let finalUrl = url;
    const enabledQueryParams = queryParams.filter(
      (param) => param.enabled && param.key,
    );
    if (enabledQueryParams.length > 0) {
      const urlObject = new URL(url.startsWith('http') ? url : `http://${url}`);
      enabledQueryParams.forEach((param) => {
        urlObject.searchParams.set(param.key, param.value);
      });
      finalUrl = urlObject.toString();
    }

    // Convert headers array to object
    const headersObject: Record<string, string> = {};
    headers
      .filter((header) => header.enabled && header.key && header.value)
      .forEach((header) => {
        headersObject[header.key] = header.value;
      });

    // Add default content type to headers if body exists and no content-type is set
    if (
      body &&
      !headersObject['Content-Type'] &&
      !headersObject['content-type']
    ) {
      headersObject['Content-Type'] = 'application/json';
    }

    const requestData = {
      method: method as HttpMethod,
      url: finalUrl,
      headers: Object.keys(headersObject).length > 0 ? headersObject : null,
      body: body || null,
      timeout: 30,
      name: `${method} ${finalUrl}`, // Required field
    };

    executeRequestMutation.mutate({ data: requestData });
  };

  const handleImportCurl = (data: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: string;
  }) => {
    importCurl(data);
  };

  const handleLoadFromHistory = (request: ApiDebugResponse) => {
    loadFromApiDebugResponse(request);
  };

  const tabItems = [
    {
      key: TAB_KEYS.PARAMS,
      label: `${t('apiDebug.params')} (${queryParams.filter((p) => p.enabled).length})`,
      children: (
        <QueryParamsEditor
          queryParams={queryParams}
          onChange={handleQueryParamsChange}
        />
      ),
    },
    {
      key: TAB_KEYS.HEADERS,
      label: `${t('apiDebug.headers')} (${headers.filter((h) => h.enabled).length})`,
      children: <HeadersEditor headers={headers} onChange={setHeaders} />,
    },
    {
      key: TAB_KEYS.BODY,
      label: t('apiDebug.body'),
      children: (
        <BodyEditor body={body} onBodyChange={setBody} headers={headers} />
      ),
    },
  ];

  const renderTabContent = () => {
    const currentTab = tabItems.find((item) => item.key === activeTab);
    return currentTab?.children;
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* History Sidebar */}
      {historyVisible && (
        <div className="w-80 flex-shrink-0 ">
          <RequestHistory
            onLoadRequest={handleLoadFromHistory}
            className="h-full"
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <CommonCard
          title={
            <div className="flex items-center gap-2">
              <Button
                type="text"
                icon={
                  historyVisible ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />
                }
                onClick={() => setHistoryVisible(!historyVisible)}
                className="text-gray-500 hover:text-blue-500"
              />
              <span>{t('apiDebug.title')}</span>
            </div>
          }
          extra={
            <Button
              onClick={() => setCurlModalVisible(true)}
              className="ml-auto"
            >
              {t('apiDebug.importCurl')}
            </Button>
          }
          className="flex flex-1 flex-col"
        >
          {/* Request Builder */}
          <div className="mt-2 shadow-sm">
            <RequestBuilder
              method={method}
              url={url}
              onMethodChange={setMethod}
              onUrlChange={handleUrlChange}
              onSend={handleSendRequest}
              isLoading={executeRequestMutation.isPending}
            />
          </div>

          {/* Main Content */}
          <div className="mt-px flex flex-1 overflow-hidden">
            {/* Left Panel - Request Configuration */}
            <div className="w-1/2 overflow-auto border-r border-gray-300 dark:border-gray-500">
              <div className="py-4">
                <Segmented
                  value={activeTab}
                  onChange={setActiveTab}
                  options={tabItems.map((item) => ({
                    label: item.label,
                    value: item.key,
                  }))}
                />
                <div className="h-full">{renderTabContent()}</div>
              </div>
            </div>

            {/* Right Panel - Response */}
            <div className="w-1/2 overflow-auto">
              <ResponseViewer
                response={response}
                isLoading={executeRequestMutation.isPending}
                error={executeRequestMutation.error?.message}
              />
            </div>
          </div>

          {/* cURL Import Modal */}
          <CurlImportModal
            visible={curlModalVisible}
            onClose={() => setCurlModalVisible(false)}
            onImport={handleImportCurl}
          />
        </CommonCard>
      </div>
    </div>
  );
}
