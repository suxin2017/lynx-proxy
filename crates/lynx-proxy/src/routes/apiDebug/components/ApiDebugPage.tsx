import { message, Segmented } from 'antd';
import { RequestBuilder } from './RequestBuilder';
import { HeadersEditor } from './HeadersEditor';
import { QueryParamsEditor } from './QueryParamsEditor';
import { BodyEditor } from './BodyEditor';
import { ResponseViewer } from './ResponseViewer';
import { CurlImportModal } from './CurlImportModal';
import { useExecuteApiRequest } from '../../../services/generated/api-debug-executor/api-debug-executor';
import { HttpMethod } from '../../../services/generated/utoipaAxum.schemas';
import { QueryParamItem, FormattedResponse } from './types';
import { CommonCard } from '@/routes/settings/components/CommonCard';
import { useApiDebug } from './store';
import { useState } from 'react';

const TAB_KEYS = {
  PARAMS: 'params',
  HEADERS: 'headers',
  BODY: 'body',
} as const;

export function ApiDebugPage() {
  const [activeTab, setActiveTab] = useState<string>(TAB_KEYS.PARAMS);

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
        message.success('Request completed successfully');
      },
      onError: (error) => {
        console.error('Request failed:', error);
        message.error('Request failed');
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
      message.warning('Please enter a URL');
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

  const tabItems = [
    {
      key: TAB_KEYS.PARAMS,
      label: `Params (${queryParams.filter((p) => p.enabled).length})`,
      children: (
        <QueryParamsEditor
          queryParams={queryParams}
          onChange={handleQueryParamsChange}
        />
      ),
    },
    {
      key: TAB_KEYS.HEADERS,
      label: `Headers (${headers.filter((h) => h.enabled).length})`,
      children: <HeadersEditor headers={headers} onChange={setHeaders} />,
    },
    {
      key: TAB_KEYS.BODY,
      label: 'Body',
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
    <CommonCard title="API Debugger" className="flex flex-col">
      {/* Request Builder */}
      <div className="mt-2 shadow-sm">
        <RequestBuilder
          method={method}
          url={url}
          onMethodChange={setMethod}
          onUrlChange={handleUrlChange}
          onSend={handleSendRequest}
          onImportCurl={() => setCurlModalVisible(true)}
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
  );
}
